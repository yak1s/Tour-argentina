import { computed, signal } from '@preact/signals';
import type { ChapterId, LatLng, Waypoint, WaypointId } from '../content/types';
import { chapterById, waypointById } from '../content';
import { loadValue, saveValue, deleteValue, requestPersistentStorage } from '../platform/db';
import { createProgress, migrateProgress, type Progress } from './progress';
import { defaultSettings, migrateSettings, type Settings } from './settings';

/**
 * Application state: the player's progress and settings as signals, wired to
 * persistent storage. Every change is written to localStorage immediately
 * (synchronous, survives an abrupt close) and to IndexedDB shortly after.
 */

const PROGRESS_KEY = 'progress';
const SETTINGS_KEY = 'settings';

export const progress = signal<Progress>(createProgress(Date.now()));
export const settings = signal<Settings>(defaultSettings(Date.now()));
export const storeReady = signal(false);
/** Non-fatal storage notices shown once (e.g. saved data could not be read). */
export const storageNotice = signal<string | null>(null);

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pendingProgress = false;
let pendingSettings = false;

function flush(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = undefined;
  if (pendingProgress) void saveValue(PROGRESS_KEY, progress.value);
  if (pendingSettings) void saveValue(SETTINGS_KEY, settings.value);
  pendingProgress = false;
  pendingSettings = false;
}

function schedule(kind: 'progress' | 'settings'): void {
  if (kind === 'progress') pendingProgress = true;
  else pendingSettings = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 120);
}

if (typeof window !== 'undefined') {
  // Write immediately when the app is hidden or closed.
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

/** Applies a pure progress transition and persists the result. */
export function update(fn: (p: Progress, now: number) => Progress): Progress {
  const before = progress.value;
  const next = fn(before, Date.now());
  if (next !== before) {
    progress.value = next;
    schedule('progress');
  }
  return next;
}

export function updateSettings(patch: Partial<Omit<Settings, 'schema'>>): void {
  settings.value = { ...settings.value, ...patch, updatedAt: Date.now() };
  schedule('settings');
}

export async function initStore(): Promise<void> {
  const now = Date.now();
  const [rawProgress, rawSettings] = await Promise.all([loadValue(PROGRESS_KEY), loadValue(SETTINGS_KEY)]);
  const { progress: p, reset, migrated } = migrateProgress(rawProgress, now);
  progress.value = p;
  settings.value = migrateSettings(rawSettings, now);
  if (reset) storageNotice.value = 'Saved progress from another version could not be read, so the tour starts fresh.';
  if (migrated) schedule('progress');
  storeReady.value = true;
}

/** Starts the game over (settings and photo memories are kept unless asked). */
export async function resetProgress(): Promise<void> {
  progress.value = createProgress(Date.now());
  await deleteValue(PROGRESS_KEY);
  await saveValue(PROGRESS_KEY, progress.value);
}

export function requestPersistence(): void {
  void requestPersistentStorage();
}

/* ------------------------------------------------------------------ */
/* Derived state                                                       */
/* ------------------------------------------------------------------ */

export const currentChapter = computed(() => chapterById(progress.value.current));

/** Position to navigate to for a waypoint: a confirmed GPS fix if we have one, else the stored coordinate. */
export function effectiveCoords(id: WaypointId): LatLng {
  const fix = progress.value.waypointFixes[id];
  return fix ? { lat: fix.lat, lng: fix.lng } : waypointById(id).coords;
}

/** A waypoint is treated as precise when it was verified, or when we recorded a GPS fix there. */
export function isPrecise(w: Waypoint): boolean {
  return w.precision === 'verified' || Boolean(progress.value.waypointFixes[w.id]);
}

export function chapterStatus(id: ChapterId) {
  return progress.value.chapters[id].status;
}
