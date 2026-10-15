import { computed, effect, signal, untracked } from '@preact/signals';
import type { ChapterId, LatLng, Waypoint } from '../content/types';
import { chapterById, waypointById } from '../content';
import { ArrivalDetector, type ArrivalReading } from '../geo/arrival';
import { bearingDeg, distanceM } from '../geo/math';
import { position } from '../platform/location';
import { heading } from '../platform/compass';
import { currentChapter, effectiveCoords, isPrecise, progress, update } from './store';
import { markArrived, recordWaypointFix } from './progress';

/**
 * Turns GPS fixes into navigation state for the current chapter.
 *
 * At verified waypoints, a confirmed arrival (several consistent fixes inside
 * the radius) marks the chapter as arrived automatically. At approximate
 * waypoints the app only *suggests* arrival; the players confirm with
 * "We're here". The manual button always works, GPS or not.
 */

export interface NavTarget {
  chapterId: ChapterId;
  waypoint: Waypoint;
  coords: LatLng;
  precise: boolean;
}

export const navTarget = computed<NavTarget>(() => {
  const chapter = currentChapter.value;
  const waypoint = waypointById(chapter.waypoint);
  // Reading progress here keeps the target in sync when a waypoint fix is recorded.
  void progress.value.waypointFixes;
  return { chapterId: chapter.id, waypoint, coords: effectiveCoords(waypoint.id), precise: isPrecise(waypoint) };
});

export const navReading = signal<ArrivalReading | null>(null);
/** Set when GPS confirms arrival (drives the arrival banner). */
export const arrivalEvent = signal<{ chapterId: ChapterId; at: number } | null>(null);
/** Set when the players seem to be at an approximate waypoint. */
export const arrivalSuggestion = signal<ChapterId | null>(null);

/** Straight-line distance/bearing from the latest fix to the target. */
export const targetVector = computed(() => {
  const fix = position.value;
  const t = navTarget.value;
  if (!fix) return null;
  const d = distanceM(fix, t.coords);
  const b = bearingDeg(fix, t.coords);
  const h = heading.value;
  return {
    distanceM: d,
    bearingDeg: b,
    accuracyM: fix.accuracy,
    /** Angle to rotate an arrow on screen (needs the compass); null without it. */
    relativeDeg: h === null ? null : (b - h + 360) % 360,
    timestamp: fix.timestamp,
  };
});

let detector: ArrivalDetector | null = null;
let detectorKey = '';
let lastFixTs = -1;

function chapterNeedsArrival(id: ChapterId): boolean {
  const st = progress.value.chapters[id].status;
  return st === 'active' || st === 'upcoming';
}

export function startNavigationEngine(): () => void {
  return effect(() => {
    const fix = position.value;
    const t = navTarget.value;
    const key = `${t.chapterId}|${t.coords.lat.toFixed(6)},${t.coords.lng.toFixed(6)}`;
    if (key !== detectorKey) {
      detector = new ArrivalDetector(t.coords, { radiusM: t.waypoint.arrivalRadiusM });
      detectorKey = key;
      lastFixTs = -1;
      arrivalSuggestion.value = null;
      navReading.value = null;
    }
    if (!fix || !detector || fix.timestamp === lastFixTs) return;
    lastFixTs = fix.timestamp;
    const reading = detector.push(fix);
    navReading.value = reading;

    untracked(() => {
      const p = progress.value;
      if (!p.started || p.paused || p.navSuspended) return;
      // During the prologue the players stand on the starting corner: remember
      // where it really is, so the return at the end is confirmed by GPS.
      if (p.current === 'prologue' && p.chapters.prologue.status === 'arrived' && !p.waypointFixes.start) {
        rememberPositionFor(waypointById('start'));
      }
      if (!reading.arrived || !chapterNeedsArrival(t.chapterId)) return;
      if (t.precise) {
        update((prev, now) => markArrived(prev, t.chapterId, 'gps', now));
        arrivalEvent.value = { chapterId: t.chapterId, at: Date.now() };
      } else if (arrivalSuggestion.value !== t.chapterId) {
        arrivalSuggestion.value = t.chapterId;
      }
    });
  });
}

/** Records the players' actual position for a waypoint when the fix is good enough. */
export function rememberPositionFor(waypoint: Waypoint): void {
  const fix = position.value;
  if (!fix || fix.accuracy > 60) return;
  if (Date.now() - fix.timestamp > 60_000) return;
  // Only plausible fixes: within 1.2 km of the published/estimated point.
  if (distanceM(fix, waypoint.coords) > 1200) return;
  update((p, now) => recordWaypointFix(p, waypoint.id, { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy }, now));
}

/** "We're here": manual arrival, always available. */
export function confirmArrival(chapterId: ChapterId): void {
  const chapter = chapterById(chapterId);
  rememberPositionFor(waypointById(chapter.waypoint));
  update((p, now) => markArrived(p, chapterId, 'manual', now));
  arrivalSuggestion.value = null;
}
