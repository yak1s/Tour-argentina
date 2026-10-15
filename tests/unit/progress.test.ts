import { describe, expect, it } from 'vitest';
import { CHAPTERS, PUZZLES } from '../../src/content';
import {
  advance,
  completeChapter,
  createProgress,
  markArrived,
  migrateProgress,
  moveChapter,
  nextUnfinished,
  openEnvelope,
  openPuzzle,
  pause,
  PROGRESS_SCHEMA,
  recordAttempt,
  recordWaypointFix,
  restorePlannedOrder,
  resume,
  revealHint,
  saveDraft,
  setCurrent,
  skipChapter,
  skipPuzzle,
  startTour,
  summarize,
} from '../../src/engine/progress';

const T0 = 1_760_000_000_000;

describe('progress', () => {
  it('starts fresh with every chapter upcoming and puzzles locked', () => {
    const p = createProgress(T0);
    expect(p.schema).toBe(PROGRESS_SCHEMA);
    expect(p.started).toBe(false);
    expect(Object.values(p.chapters).every((c) => c.status === 'upcoming')).toBe(true);
    expect(Object.values(p.puzzles).every((s) => s.status === 'locked')).toBe(true);
    expect(p.order[0]).toBe('prologue');
    expect(p.order[p.order.length - 1]).toBe('finale');
  });

  it('starting the tour arrives at the prologue and opens its warm-up', () => {
    const p = startTour(createProgress(T0), T0);
    expect(p.started).toBe(true);
    expect(p.chapters.prologue.status).toBe('arrived');
    expect(p.puzzles['p-corner']!.status).toBe('open');
    expect(p.facts.length).toBeGreaterThan(0);
    expect(startTour(p, T0 + 1)).toBe(p);
  });

  it('records wrong attempts without blocking, then solves and completes the chapter', () => {
    let p = startTour(createProgress(T0), T0);
    p = recordAttempt(p, 'p-corner', 'Cordoba', false, T0 + 1);
    p = recordAttempt(p, 'p-corner', 'Rivadavia', false, T0 + 2);
    expect(p.puzzles['p-corner']!.attempts).toBe(2);
    expect(p.puzzles['p-corner']!.wrong).toEqual(['Cordoba', 'Rivadavia']);
    expect(p.puzzles['p-corner']!.status).toBe('open');
    p = recordAttempt(p, 'p-corner', 'Gallo', true, T0 + 3);
    expect(p.puzzles['p-corner']!.status).toBe('solved');
    expect(p.chapters.prologue.status).toBe('complete');
    expect(p.threads).toContain('t-older');
    // Further attempts are ignored once solved.
    expect(recordAttempt(p, 'p-corner', 'x', false, T0 + 4)).toBe(p);
  });

  it('reveals hints one at a time, never beyond the last', () => {
    let p = startTour(createProgress(T0), T0);
    const n = PUZZLES['p-corner']!.hints.length;
    for (let i = 0; i < n + 3; i++) p = revealHint(p, 'p-corner', T0 + i);
    expect(p.puzzles['p-corner']!.hintsRevealed).toBe(n);
  });

  it('skipping a challenge is recorded as skipped, completes the chapter and keeps the thread', () => {
    let p = startTour(createProgress(T0), T0);
    p = setCurrent(p, 'key', T0);
    p = markArrived(p, 'key', 'gps', T0);
    p = skipPuzzle(p, 'p-key', T0 + 5);
    expect(p.puzzles['p-key']!.status).toBe('skipped');
    expect(p.chapters.key.status).toBe('complete');
    expect(p.threads).toContain('t-streets');
    expect(p.deductions.key).toBe('1412');
  });

  it('skipping a whole stop moves on, keeps the thread, and never applies to prologue or finale', () => {
    let p = startTour(createProgress(T0), T0);
    p = setCurrent(p, 'colours', T0);
    p = skipChapter(p, 'colours', 'unsafe', T0 + 1);
    expect(p.chapters.colours.status).toBe('skipped');
    expect(p.puzzles['p-tale']!.status).toBe('skipped');
    expect(p.threads).toContain('t-mouth');
    expect(p.current).toBe('garden');
    expect(skipChapter(p, 'prologue', 'x', T0)).toBe(p);
    expect(skipChapter(p, 'finale', 'x', T0)).toBe(p);
  });

  it('opening a challenge directly (stop closed) counts as being there', () => {
    let p = startTour(createProgress(T0), T0);
    p = openPuzzle(p, 'p-tiles', T0 + 1);
    expect(p.puzzles['p-tiles']!.status).toBe('open');
    expect(p.chapters.garden.status).toBe('arrived');
    expect(p.current).toBe('garden');
  });

  it('keeps drafts until solved', () => {
    let p = startTour(createProgress(T0), T0);
    p = saveDraft(p, 'p-corner', 'Gal', T0 + 1);
    expect(p.puzzles['p-corner']!.draft).toBe('Gal');
    p = recordAttempt(p, 'p-corner', 'Gallo', true, T0);
    expect(p.puzzles['p-corner']!.draft).toBeUndefined();
  });

  it('reorders only remaining middle stops and can restore the plan', () => {
    let p = startTour(createProgress(T0), T0);
    const before = [...p.order];
    p = moveChapter(p, 'garden', 1, T0);
    expect(p.order.indexOf('garden')).toBe(before.indexOf('garden') + 1);
    expect(p.order[0]).toBe('prologue');
    expect(p.order[p.order.length - 1]).toBe('finale');
    expect(moveChapter(p, 'prologue', 1, T0)).toBe(p);
    expect(moveChapter(p, 'garden', 1, T0)).toBe(p); // now just before the finale: can't move past it
    p = restorePlannedOrder(p, T0);
    expect(p.order).toEqual(before);
  });

  it('accumulates paused time', () => {
    let p = startTour(createProgress(T0), T0);
    p = pause(p, 'Lunch', T0 + 1000);
    expect(p.paused?.reason).toBe('Lunch');
    p = resume(p, T0 + 61_000);
    expect(p.paused).toBeNull();
    expect(p.pausedTotalMs).toBe(60_000);
  });

  it('remembers the most accurate waypoint fix', () => {
    let p = createProgress(T0);
    p = recordWaypointFix(p, 'start', { lat: -34.6, lng: -58.41, accuracy: 30 }, T0);
    p = recordWaypointFix(p, 'start', { lat: -34.61, lng: -58.42, accuracy: 50 }, T0);
    expect(p.waypointFixes.start!.accuracy).toBe(30);
    p = recordWaypointFix(p, 'start', { lat: -34.601, lng: -58.411, accuracy: 8 }, T0);
    expect(p.waypointFixes.start!.accuracy).toBe(8);
  });

  it('plays through the whole game to the envelope', () => {
    let p = startTour(createProgress(T0), T0);
    let t = T0;
    for (const ch of CHAPTERS) {
      p = setCurrent(p, ch.id, ++t);
      p = markArrived(p, ch.id, 'manual', ++t);
      if (ch.puzzleId) p = recordAttempt(p, ch.puzzleId, 'answer', true, ++t);
      else p = completeChapter(p, ch.id, ++t);
      p = advance(p, ++t);
    }
    p = openEnvelope(p, ++t);
    const s = summarize(p);
    expect(s.solved).toBe(Object.keys(PUZZLES).length);
    expect(s.stopsVisited).toBe(s.totalStops);
    expect(p.threads).toHaveLength(9);
    expect(p.envelopeOpened).toBe(true);
    expect(nextUnfinished(p)).toBeNull();
  });
});

describe('migration', () => {
  it('returns fresh progress for nothing stored', () => {
    const r = migrateProgress(undefined, T0);
    expect(r.reset).toBe(false);
    expect(r.progress.started).toBe(false);
  });

  it('resets (and says so) for garbage or a newer, unknown schema', () => {
    expect(migrateProgress('nonsense', T0).reset).toBe(true);
    expect(migrateProgress({ schema: 999 }, T0).reset).toBe(true);
    expect(migrateProgress({ schema: 'x' }, T0).reset).toBe(true);
  });

  it('round-trips a saved game exactly', () => {
    let p = startTour(createProgress(T0), T0);
    p = recordAttempt(p, 'p-corner', 'Gallo', true, T0 + 1);
    p = advance(p, T0 + 2);
    p = recordWaypointFix(p, 'start', { lat: -34.6, lng: -58.41, accuracy: 12 }, T0 + 3);
    const stored = JSON.parse(JSON.stringify(p));
    const r = migrateProgress(stored, T0 + 10);
    expect(r.reset).toBe(false);
    expect(r.progress).toEqual(p);
  });

  it('repairs partial or damaged data without losing what is valid', () => {
    const p = startTour(createProgress(T0), T0);
    const damaged = JSON.parse(JSON.stringify(p));
    damaged.chapters.key = { status: 'flying' };
    delete damaged.chapters.garden;
    damaged.chapters.unknownStop = { status: 'complete' };
    damaged.puzzles['p-corner'].hintsRevealed = 99;
    damaged.threads = ['t-older', 'not-a-thread', 5];
    damaged.order = ['finale', 'garden', 'key', 'bogus'];
    const r = migrateProgress(damaged, T0);
    expect(r.reset).toBe(false);
    expect(r.progress.chapters.key.status).toBe('upcoming');
    expect(r.progress.chapters.garden.status).toBe('upcoming');
    expect('unknownStop' in r.progress.chapters).toBe(false);
    expect(r.progress.puzzles['p-corner']!.hintsRevealed).toBe(PUZZLES['p-corner']!.hints.length);
    expect(r.progress.threads).toEqual(['t-older']);
    expect(r.progress.order[0]).toBe('prologue');
    expect(r.progress.order[r.progress.order.length - 1]).toBe('finale');
    expect(new Set(r.progress.order).size).toBe(CHAPTERS.length);
  });

  it('applies step-wise migrations from older schemas', () => {
    const old = { schema: 0, started: true, current: 'key', legacyHints: { 'p-corner': 2 } };
    const migrations = {
      0: (d: Record<string, unknown>) => ({
        ...d,
        puzzles: { 'p-corner': { status: 'open', hintsRevealed: (d.legacyHints as Record<string, number>)['p-corner'], attempts: 0, wrong: [] } },
      }),
    };
    const r = migrateProgress(old, T0, migrations, 1);
    expect(r.migrated).toBe(true);
    expect(r.progress.started).toBe(true);
    expect(r.progress.current).toBe('key');
    expect(r.progress.puzzles['p-corner']!.hintsRevealed).toBe(2);
  });

  it('resets when a migration step is missing', () => {
    expect(migrateProgress({ schema: 0 }, T0, {}, 1).reset).toBe(true);
  });
});
