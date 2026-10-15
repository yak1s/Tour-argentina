import type { ChapterId } from '../content/types';
import { CHAPTERS, CHAPTER_IDS, chapterById, puzzleById, PUZZLES } from '../content';

/**
 * Player progress. Everything here is plain JSON so it can be stored in
 * IndexedDB (with a localStorage mirror) and survives reloads, closing the
 * app, and updates of the app itself (see migrateProgress).
 *
 * All functions in this module are pure: they return a new object and never
 * mutate their input. The store (engine/store.ts) wires them to persistence.
 */

export const PROGRESS_SCHEMA = 1;

/**
 * Step-wise upgrades of stored progress, keyed by the schema they upgrade
 * FROM. When the stored shape changes in a future release, bump
 * PROGRESS_SCHEMA and add `MIGRATIONS[old] = (data) => upgradedData`.
 * migrateProgress applies them in sequence; a missing step resets safely.
 */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;
export const MIGRATIONS: Record<number, Migration> = {};

export type ChapterStatus = 'upcoming' | 'active' | 'arrived' | 'complete' | 'skipped';
export type PuzzleStatus = 'locked' | 'open' | 'solved' | 'skipped';

export interface ChapterState {
  status: ChapterStatus;
  arrivedAt?: number;
  arrivedBy?: 'gps' | 'manual';
  completedAt?: number;
  skipReason?: string;
}

export interface PuzzleState {
  status: PuzzleStatus;
  hintsRevealed: number;
  attempts: number;
  /** The last few wrong answers, newest last (shown so players don't repeat themselves). */
  wrong: string[];
  solvedAt?: number;
  /** Unsent answer in progress, restored after a reload. */
  draft?: string | string[];
}

export interface Progress {
  schema: typeof PROGRESS_SCHEMA;
  createdAt: number;
  updatedAt: number;
  started: boolean;
  startedAt?: number;
  finishedAt?: number;
  /** Planned chapter order (prologue always first, finale always last). */
  order: ChapterId[];
  /** The chapter the players are currently working on. */
  current: ChapterId;
  chapters: Record<ChapterId, ChapterState>;
  puzzles: Record<string, PuzzleState>;
  /** Collected narrator lines (thread ids), in collection order. */
  threads: string[];
  /** Facts the players have unlocked by reaching a stop. */
  facts: string[];
  /** Named deductions recorded during play, e.g. { key: '1412' }. */
  deductions: Record<string, string>;
  extrasDone: string[];
  envelopeOpened: boolean;
  paused: null | { since: number; reason: string };
  pausedTotalMs: number;
  /** When true the GPS watch is suspended but the game continues. */
  navSuspended: boolean;
  /**
   * Positions recorded when the players confirmed arrival with a good GPS fix.
   * They replace approximate waypoint coordinates for the rest of the game
   * (most usefully the starting corner, to which the tour returns).
   */
  waypointFixes: Record<string, { lat: number; lng: number; accuracy: number }>;
  /** Last visited in-app route, restored after a reload. */
  lastRoute?: string;
}

const FIRST: ChapterId = 'prologue';
const LAST: ChapterId = 'finale';

function emptyPuzzleState(): PuzzleState {
  return { status: 'locked', hintsRevealed: 0, attempts: 0, wrong: [] };
}

export function createProgress(now: number): Progress {
  const chapters = {} as Record<ChapterId, ChapterState>;
  for (const id of CHAPTER_IDS) chapters[id] = { status: 'upcoming' };
  const puzzles: Record<string, PuzzleState> = {};
  for (const id of Object.keys(PUZZLES)) puzzles[id] = emptyPuzzleState();
  return {
    schema: PROGRESS_SCHEMA,
    createdAt: now,
    updatedAt: now,
    started: false,
    order: [...CHAPTER_IDS],
    current: FIRST,
    chapters,
    puzzles,
    threads: [],
    facts: [],
    deductions: {},
    extrasDone: [],
    envelopeOpened: false,
    paused: null,
    pausedTotalMs: 0,
    navSuspended: false,
    waypointFixes: {},
  };
}

function touch(p: Progress, now: number): Progress {
  return { ...p, updatedAt: now };
}

function setChapter(p: Progress, id: ChapterId, patch: Partial<ChapterState>): Progress {
  return { ...p, chapters: { ...p.chapters, [id]: { ...p.chapters[id], ...patch } } };
}

function setPuzzle(p: Progress, id: string, patch: Partial<PuzzleState>): Progress {
  const prev = p.puzzles[id] ?? emptyPuzzleState();
  return { ...p, puzzles: { ...p.puzzles, [id]: { ...prev, ...patch } } };
}

export function isDone(status: ChapterStatus): boolean {
  return status === 'complete' || status === 'skipped';
}

/** First chapter in the planned order that is not finished. */
export function nextUnfinished(p: Progress, after?: ChapterId): ChapterId | null {
  const start = after ? p.order.indexOf(after) + 1 : 0;
  for (let i = start; i < p.order.length; i++) {
    const id = p.order[i]!;
    if (!isDone(p.chapters[id].status)) return id;
  }
  // Wrap around: an earlier chapter may have been left unfinished after a reorder.
  for (let i = 0; i < start; i++) {
    const id = p.order[i]!;
    if (!isDone(p.chapters[id].status)) return id;
  }
  return null;
}

function addUnique<T>(list: T[], items: T[]): T[] {
  const out = [...list];
  for (const it of items) if (!out.includes(it)) out.push(it);
  return out;
}

/** Begins the tour at the starting corner. */
export function startTour(p: Progress, now: number): Progress {
  if (p.started) return p;
  let next: Progress = { ...p, started: true, startedAt: now, current: FIRST };
  next = markArrived(next, FIRST, 'manual', now);
  return touch(next, now);
}

/** Makes a chapter the current target (manual destination selection or "return to route"). */
export function setCurrent(p: Progress, id: ChapterId, now: number): Progress {
  if (!p.chapters[id]) return p;
  let next = p;
  const prev = p.current;
  if (prev !== id && p.chapters[prev]?.status === 'active') next = setChapter(next, prev, { status: 'upcoming' });
  if (next.chapters[id].status === 'upcoming') next = setChapter(next, id, { status: 'active' });
  return touch({ ...next, current: id }, now);
}

/** The players are at the waypoint (GPS-confirmed or manual). Unlocks facts and the challenge. */
export function markArrived(p: Progress, id: ChapterId, by: 'gps' | 'manual', now: number): Progress {
  const ch = p.chapters[id];
  if (!ch || isDone(ch.status) || ch.status === 'arrived') return p;
  let next = setChapter(p, id, { status: 'arrived', arrivedAt: now, arrivedBy: by });
  const chapter = chapterById(id);
  next = { ...next, facts: addUnique(next.facts, chapter.facts.map((f) => f.id)) };
  if (chapter.puzzleId && next.puzzles[chapter.puzzleId]?.status === 'locked') {
    next = setPuzzle(next, chapter.puzzleId, { status: 'open' });
  }
  return touch({ ...next, current: id }, now);
}

/** Opening a challenge without GPS arrival is always allowed (fallback path). */
export function openPuzzle(p: Progress, puzzleId: string, now: number): Progress {
  const st = p.puzzles[puzzleId];
  if (!st || st.status !== 'locked') return p;
  const puzzle = puzzleById(puzzleId);
  let next = setPuzzle(p, puzzleId, { status: 'open' });
  // Opening the challenge means the players are working on this stop.
  const ch = next.chapters[puzzle.chapter];
  if (ch.status === 'upcoming' || ch.status === 'active') {
    next = setChapter(next, puzzle.chapter, { status: 'arrived', arrivedAt: now, arrivedBy: 'manual' });
    next = { ...next, facts: addUnique(next.facts, chapterById(puzzle.chapter).facts.map((f) => f.id)) };
  }
  return touch({ ...next, current: puzzle.chapter }, now);
}

export function saveDraft(p: Progress, puzzleId: string, draft: string | string[], now: number): Progress {
  if (!p.puzzles[puzzleId]) return p;
  return touch(setPuzzle(p, puzzleId, { draft }), now);
}

export function revealHint(p: Progress, puzzleId: string, now: number): Progress {
  const st = p.puzzles[puzzleId];
  if (!st) return p;
  const total = puzzleById(puzzleId).hints.length;
  if (st.hintsRevealed >= total) return p;
  return touch(setPuzzle(p, puzzleId, { hintsRevealed: st.hintsRevealed + 1 }), now);
}

/** Records an attempt. When correct, the puzzle is solved and its chapter completes. */
export function recordAttempt(p: Progress, puzzleId: string, answerText: string, correct: boolean, now: number): Progress {
  const st = p.puzzles[puzzleId];
  if (!st || st.status === 'solved' || st.status === 'skipped') return p;
  if (correct) {
    let next = setPuzzle(p, puzzleId, { status: 'solved', attempts: st.attempts + 1, solvedAt: now, draft: undefined });
    next = completeChapter(next, puzzleById(puzzleId).chapter, now);
    return touch(next, now);
  }
  const wrong = [...st.wrong, answerText].slice(-5);
  return touch(setPuzzle(p, puzzleId, { status: 'open', attempts: st.attempts + 1, wrong }), now);
}

/** Skips an impossible challenge: recorded as skipped (never as solved); the story continues. */
export function skipPuzzle(p: Progress, puzzleId: string, now: number): Progress {
  const st = p.puzzles[puzzleId];
  if (!st || st.status === 'solved' || st.status === 'skipped') return p;
  let next = setPuzzle(p, puzzleId, { status: 'skipped', draft: undefined });
  next = completeChapter(next, puzzleById(puzzleId).chapter, now);
  return touch(next, now);
}

/** Collects the chapter's thread and marks it complete. Does not move the players on by itself. */
export function completeChapter(p: Progress, id: ChapterId, now: number): Progress {
  const ch = p.chapters[id];
  if (!ch || isDone(ch.status)) return p;
  const chapter = chapterById(id);
  let next = setChapter(p, id, { status: 'complete', completedAt: now });
  if (!next.chapters[id].arrivedAt) next = setChapter(next, id, { arrivedAt: now, arrivedBy: 'manual' });
  if (chapter.thread) next = { ...next, threads: addUnique(next.threads, [chapter.thread.id]) };
  next = { ...next, facts: addUnique(next.facts, chapter.facts.map((f) => f.id)) };
  if (id === 'key') next = { ...next, deductions: { ...next.deductions, key: next.deductions.key ?? '1412' } };
  return touch(next, now);
}

/**
 * Skips a whole stop (closed, unsafe, no time...). The chapter's narrator line
 * is still added to the journal so the final deduction stays solvable.
 */
export function skipChapter(p: Progress, id: ChapterId, reason: string, now: number): Progress {
  const ch = p.chapters[id];
  if (!ch || isDone(ch.status) || id === FIRST || id === LAST) return p;
  const chapter = chapterById(id);
  let next = setChapter(p, id, { status: 'skipped', completedAt: now, skipReason: reason });
  if (chapter.puzzleId) {
    const pst = next.puzzles[chapter.puzzleId];
    if (pst && pst.status !== 'solved') next = setPuzzle(next, chapter.puzzleId, { status: 'skipped', draft: undefined });
  }
  if (chapter.thread) next = { ...next, threads: addUnique(next.threads, [chapter.thread.id]) };
  next = { ...next, facts: addUnique(next.facts, chapter.facts.map((f) => f.id)) };
  if (id === 'key') next = { ...next, deductions: { ...next.deductions, key: next.deductions.key ?? '1412' } };
  if (next.current === id) {
    const after = nextUnfinished(next, id);
    if (after) next = setCurrent(next, after, now);
  }
  return touch(next, now);
}

/** Moves on to the next unfinished chapter in the planned order. */
export function advance(p: Progress, now: number): Progress {
  const target = nextUnfinished(p, p.current);
  if (!target) return p;
  return setCurrent(p, target, now);
}

/** Reorders a remaining stop. The prologue and the finale never move; finished chapters keep their place. */
export function moveChapter(p: Progress, id: ChapterId, direction: -1 | 1, now: number): Progress {
  if (id === FIRST || id === LAST || isDone(p.chapters[id].status)) return p;
  const order = [...p.order];
  const i = order.indexOf(id);
  const j = i + direction;
  if (i < 0 || j <= 0 || j >= order.length - 1) return p;
  const other = order[j]!;
  if (isDone(p.chapters[other].status)) return p;
  order[i] = other;
  order[j] = id;
  return touch({ ...p, order }, now);
}

/** Restores the original planned order for chapters that are not finished. */
export function restorePlannedOrder(p: Progress, now: number): Progress {
  return touch({ ...p, order: [...CHAPTER_IDS] }, now);
}

export function setDeduction(p: Progress, key: string, value: string, now: number): Progress {
  return touch({ ...p, deductions: { ...p.deductions, [key]: value } }, now);
}

export function markExtraDone(p: Progress, extraId: string, now: number): Progress {
  if (p.extrasDone.includes(extraId)) return p;
  return touch({ ...p, extrasDone: [...p.extrasDone, extraId] }, now);
}

export function pause(p: Progress, reason: string, now: number): Progress {
  if (p.paused) return p;
  return touch({ ...p, paused: { since: now, reason } }, now);
}

export function resume(p: Progress, now: number): Progress {
  if (!p.paused) return p;
  return touch({ ...p, paused: null, pausedTotalMs: p.pausedTotalMs + Math.max(0, now - p.paused.since) }, now);
}

export function setNavSuspended(p: Progress, suspended: boolean, now: number): Progress {
  return touch({ ...p, navSuspended: suspended }, now);
}

export function openEnvelope(p: Progress, now: number): Progress {
  if (p.envelopeOpened) return p;
  let next: Progress = { ...p, envelopeOpened: true, finishedAt: p.finishedAt ?? now };
  next = completeChapter(next, LAST, now);
  return touch(next, now);
}

/** Remembers where a waypoint really is, from a confident GPS fix taken on arrival. */
export function recordWaypointFix(
  p: Progress,
  waypointId: string,
  fix: { lat: number; lng: number; accuracy: number },
  now: number,
): Progress {
  const prev = p.waypointFixes[waypointId];
  if (prev && prev.accuracy <= fix.accuracy) return p;
  return touch({ ...p, waypointFixes: { ...p.waypointFixes, [waypointId]: fix } }, now);
}

export function setLastRoute(p: Progress, route: string, now: number): Progress {
  if (p.lastRoute === route) return p;
  return touch({ ...p, lastRoute: route }, now);
}

/* ------------------------------------------------------------------ */
/* Derived values                                                      */
/* ------------------------------------------------------------------ */

export interface Summary {
  solved: number;
  skippedPuzzles: number;
  hintsUsed: number;
  stopsVisited: number;
  stopsSkipped: number;
  totalStops: number;
  threads: number;
}

export function summarize(p: Progress): Summary {
  const puzzleStates = Object.values(p.puzzles);
  const stopIds = p.order.filter((id) => id !== FIRST && id !== LAST);
  return {
    solved: puzzleStates.filter((s) => s.status === 'solved').length,
    skippedPuzzles: puzzleStates.filter((s) => s.status === 'skipped').length,
    hintsUsed: puzzleStates.reduce((n, s) => n + s.hintsRevealed, 0),
    stopsVisited: stopIds.filter((id) => p.chapters[id].status === 'complete').length,
    stopsSkipped: stopIds.filter((id) => p.chapters[id].status === 'skipped').length,
    totalStops: stopIds.length,
    threads: p.threads.length,
  };
}

/** 0–1 share of chapters finished. */
export function completion(p: Progress): number {
  const done = p.order.filter((id) => isDone(p.chapters[id].status)).length;
  return done / p.order.length;
}

/* ------------------------------------------------------------------ */
/* Migration & validation                                              */
/* ------------------------------------------------------------------ */

function sanitizeFixes(x: unknown): Progress['waypointFixes'] {
  const out: Progress['waypointFixes'] = {};
  if (!isObject(x)) return out;
  for (const [id, v] of Object.entries(x)) {
    if (!isObject(v)) continue;
    const lat = Number(v.lat);
    const lng = Number(v.lng);
    const accuracy = Number(v.accuracy);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(accuracy) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      out[id] = { lat, lng, accuracy };
    }
  }
  return out;
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

const CHAPTER_STATUSES: ChapterStatus[] = ['upcoming', 'active', 'arrived', 'complete', 'skipped'];
const PUZZLE_STATUSES: PuzzleStatus[] = ['locked', 'open', 'solved', 'skipped'];

/**
 * Turns whatever was stored into a valid Progress for the current content.
 *
 * - Unknown or corrupt data yields a fresh progress (reported via `reset`).
 * - Older schemas are upgraded step by step through MIGRATIONS.
 * - A newer schema than this build understands (a downgrade) is not misread:
 *   it is reset.
 * - Chapters or puzzles that no longer exist are dropped; new ones are added
 *   as upcoming/locked, so a content update never corrupts a game in progress.
 */
export function migrateProgress(
  raw: unknown,
  now: number,
  migrations: Record<number, Migration> = MIGRATIONS,
  targetSchema: number = PROGRESS_SCHEMA,
): { progress: Progress; reset: boolean; migrated: boolean } {
  if (!isObject(raw) || typeof raw.schema !== 'number') {
    return { progress: createProgress(now), reset: raw !== undefined && raw !== null, migrated: false };
  }
  let data: Record<string, unknown> = { ...raw };
  let migrated = false;
  while (typeof data.schema === 'number' && data.schema < targetSchema) {
    const step = migrations[data.schema];
    if (!step) return { progress: createProgress(now), reset: true, migrated: false };
    const from = data.schema;
    data = { ...step(data), schema: from + 1 };
    migrated = true;
  }
  if (data.schema !== targetSchema) {
    return { progress: createProgress(now), reset: true, migrated: false };
  }

  const base = createProgress(now);
  const chapters = { ...base.chapters };
  if (isObject(data.chapters)) {
    for (const id of CHAPTER_IDS) {
      const c = (data.chapters as Record<string, unknown>)[id];
      if (isObject(c) && CHAPTER_STATUSES.includes(c.status as ChapterStatus)) {
        chapters[id] = {
          status: c.status as ChapterStatus,
          arrivedAt: typeof c.arrivedAt === 'number' ? c.arrivedAt : undefined,
          arrivedBy: c.arrivedBy === 'gps' || c.arrivedBy === 'manual' ? c.arrivedBy : undefined,
          completedAt: typeof c.completedAt === 'number' ? c.completedAt : undefined,
          skipReason: typeof c.skipReason === 'string' ? c.skipReason : undefined,
        };
      }
    }
  }
  const puzzles = { ...base.puzzles };
  if (isObject(data.puzzles)) {
    for (const id of Object.keys(PUZZLES)) {
      const s = (data.puzzles as Record<string, unknown>)[id];
      if (isObject(s) && PUZZLE_STATUSES.includes(s.status as PuzzleStatus)) {
        const max = puzzleById(id).hints.length;
        puzzles[id] = {
          status: s.status as PuzzleStatus,
          hintsRevealed: Math.max(0, Math.min(max, Number(s.hintsRevealed) || 0)),
          attempts: Math.max(0, Number(s.attempts) || 0),
          wrong: Array.isArray(s.wrong) ? (s.wrong as unknown[]).filter((w): w is string => typeof w === 'string').slice(-5) : [],
          solvedAt: typeof s.solvedAt === 'number' ? s.solvedAt : undefined,
          draft: typeof s.draft === 'string' || Array.isArray(s.draft) ? (s.draft as string | string[]) : undefined,
        };
      }
    }
  }
  // Order: keep the stored order for known ids, append new ones before the finale, pin first/last.
  let order: ChapterId[] = Array.isArray(data.order)
    ? (data.order as unknown[]).filter((id): id is ChapterId => typeof id === 'string' && (CHAPTER_IDS as string[]).includes(id))
    : [...CHAPTER_IDS];
  order = order.filter((id, i) => order.indexOf(id) === i && id !== FIRST && id !== LAST);
  for (const id of CHAPTER_IDS) if (!order.includes(id) && id !== FIRST && id !== LAST) order.push(id);
  order = [FIRST, ...order, LAST];

  const strList = (x: unknown) => (Array.isArray(x) ? (x as unknown[]).filter((v): v is string => typeof v === 'string') : []);
  const threadIds = new Set(CHAPTERS.flatMap((c) => (c.thread ? [c.thread.id] : [])));
  const factIds = new Set(CHAPTERS.flatMap((c) => c.facts.map((f) => f.id)));
  const current = typeof data.current === 'string' && (CHAPTER_IDS as string[]).includes(data.current) ? (data.current as ChapterId) : FIRST;
  const deductions: Record<string, string> = {};
  if (isObject(data.deductions)) {
    for (const [k, v] of Object.entries(data.deductions)) if (typeof v === 'string') deductions[k] = v;
  }
  const paused = isObject(data.paused) && typeof data.paused.since === 'number'
    ? { since: data.paused.since, reason: typeof data.paused.reason === 'string' ? data.paused.reason : 'Break' }
    : null;

  const progress: Progress = {
    schema: PROGRESS_SCHEMA,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : now,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : now,
    started: data.started === true,
    startedAt: typeof data.startedAt === 'number' ? data.startedAt : undefined,
    finishedAt: typeof data.finishedAt === 'number' ? data.finishedAt : undefined,
    order,
    current,
    chapters,
    puzzles,
    threads: strList(data.threads).filter((t) => threadIds.has(t)),
    facts: strList(data.facts).filter((f) => factIds.has(f)),
    deductions,
    extrasDone: strList(data.extrasDone),
    envelopeOpened: data.envelopeOpened === true,
    paused,
    pausedTotalMs: Math.max(0, Number(data.pausedTotalMs) || 0),
    navSuspended: data.navSuspended === true,
    waypointFixes: sanitizeFixes(data.waypointFixes),
    lastRoute: typeof data.lastRoute === 'string' ? data.lastRoute : undefined,
  };
  return { progress, reset: false, migrated };
}
