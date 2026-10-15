import type { LatLng } from '../content/types';
import { distanceM } from './math';

export interface Fix extends LatLng {
  /** Horizontal accuracy radius reported by the device, metres (68% confidence). */
  accuracy: number;
  /** Epoch milliseconds. */
  timestamp: number;
}

export type Proximity = 'unknown' | 'far' | 'approaching' | 'near' | 'arrived';

export interface ArrivalConfig {
  /** Radius around the target that counts as "here". */
  radiusM: number;
  /** Fixes less accurate than this never count towards arrival. */
  maxAccuracyM?: number;
  /** Number of qualifying fixes needed inside the time window. */
  requiredHits?: number;
  /** Time window for the qualifying fixes. */
  windowMs?: number;
}

export interface ArrivalReading {
  proximity: Proximity;
  /** Straight-line distance from the latest fix to the target. */
  distanceM: number | null;
  /** Accuracy of the latest fix. */
  accuracyM: number | null;
  /** True once arrival has been confirmed (latched until reset). */
  arrived: boolean;
  /** Human-readable explanation of what the detector is waiting for. */
  note: string;
}

const DEFAULTS = { maxAccuracyM: 100, requiredHits: 2, windowMs: 90_000 };

/**
 * Decides when players have reached a waypoint.
 *
 * GPS in dense streets drifts by tens of metres, so a single fix never counts
 * unless it is very precise and well inside the radius. Accuracy is allowed to
 * extend the radius a little (capped), and once arrival is confirmed it stays
 * confirmed: drifting back out never "un-arrives" the players.
 */
export class ArrivalDetector {
  private hits: number[] = [];
  private latched = false;
  private last: Fix | null = null;
  private readonly cfg: Required<ArrivalConfig>;

  constructor(
    private readonly target: LatLng,
    cfg: ArrivalConfig,
  ) {
    this.cfg = { ...DEFAULTS, ...cfg };
  }

  get arrived(): boolean {
    return this.latched;
  }

  reset(): void {
    this.hits = [];
    this.latched = false;
    this.last = null;
  }

  /** Effective radius for a fix: the target radius plus up to half the accuracy (max 35 m). */
  effectiveRadius(accuracy: number): number {
    return this.cfg.radiusM + Math.min(accuracy / 2, 35);
  }

  push(fix: Fix): ArrivalReading {
    // Ignore fixes that go back in time (can happen when the browser replays a cached position).
    if (this.last && fix.timestamp < this.last.timestamp) return this.reading();
    this.last = fix;
    const d = distanceM(fix, this.target);
    const usable = fix.accuracy <= this.cfg.maxAccuracyM;

    if (!this.latched && usable && d <= this.effectiveRadius(fix.accuracy)) {
      this.hits.push(fix.timestamp);
      this.hits = this.hits.filter((t) => fix.timestamp - t <= this.cfg.windowMs);
      const precise = fix.accuracy <= 15 && d <= this.cfg.radiusM * 0.6;
      if (precise || this.hits.length >= this.cfg.requiredHits) this.latched = true;
    }
    return this.reading();
  }

  reading(): ArrivalReading {
    const fix = this.last;
    if (!fix) {
      return { proximity: 'unknown', distanceM: null, accuracyM: null, arrived: this.latched, note: 'Waiting for a location fix.' };
    }
    const d = distanceM(fix, this.target);
    let proximity: Proximity;
    if (this.latched) proximity = 'arrived';
    else if (d <= this.cfg.radiusM * 2.5) proximity = 'near';
    else if (d <= 600) proximity = 'approaching';
    else proximity = 'far';

    let note: string;
    if (this.latched) note = 'You have arrived.';
    else if (fix.accuracy > this.cfg.maxAccuracyM) note = `Location is imprecise (±${Math.round(fix.accuracy)} m); arrival will be confirmed when it improves, or tap “We're here”.`;
    else if (proximity === 'near') note = 'Almost there. Confirming your position…';
    else note = '';
    return { proximity, distanceM: d, accuracyM: fix.accuracy, arrived: this.latched, note };
  }
}
