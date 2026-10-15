import type { LatLng } from '../content/types';

/** Mean Earth radius in metres (IUGG). */
const R = 6_371_008.8;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Great-circle (straight-line) distance in metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Initial bearing from a to b, degrees clockwise from true north, 0–360. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return normalizeDeg(toDeg(Math.atan2(y, x)));
}

/** Normalises an angle to [0, 360). Values within a hair of 360 become 0. */
export function normalizeDeg(d: number): number {
  const n = ((d % 360) + 360) % 360;
  return n > 360 - 1e-9 || n < 1e-9 ? 0 : n;
}

/** Smallest signed difference a − b in degrees, in (−180, 180]. */
export function angleDiff(a: number, b: number): number {
  let d = normalizeDeg(a) - normalizeDeg(b);
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

const POINTS_16 = [
  'north', 'north-northeast', 'northeast', 'east-northeast',
  'east', 'east-southeast', 'southeast', 'south-southeast',
  'south', 'south-southwest', 'southwest', 'west-southwest',
  'west', 'west-northwest', 'northwest', 'north-northwest',
] as const;
const POINTS_8 = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'] as const;
const SHORT_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function compassWord(deg: number, points: 8 | 16 = 8): string {
  const n = normalizeDeg(deg);
  if (points === 16) return POINTS_16[Math.round(n / 22.5) % 16]!;
  return POINTS_8[Math.round(n / 45) % 8]!;
}

export function compassShort(deg: number): string {
  return SHORT_8[Math.round(normalizeDeg(deg) / 45) % 8]!;
}

/**
 * Formats a straight-line distance for people on foot. Large distances are
 * rounded more coarsely so we never imply false precision.
 */
export function formatDistance(m: number): string {
  if (!Number.isFinite(m)) return '—';
  if (m < 20) return 'a few metres';
  if (m < 100) return `${Math.round(m / 5) * 5} m`;
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  if (m < 10_000) return `${(Math.round(m / 100) / 10).toFixed(1)} km`;
  return `${Math.round(m / 1000)} km`;
}

/**
 * Converts a straight-line distance to a rough walking-time range. City
 * streets are rarely straight, so we inflate by a detour factor (1.25–1.45)
 * and use 4.5 km/h, which includes waiting at crossings.
 */
export function walkingMinutesRange(straightM: number): [number, number] {
  const speed = 75; // metres per minute (4.5 km/h)
  const lo = Math.max(1, Math.round((straightM * 1.2) / speed));
  const hi = Math.max(lo + 1, Math.round((straightM * 1.45) / speed));
  return [lo, hi];
}

export function formatMinutes([lo, hi]: [number, number]): string {
  if (hi <= 1) return 'about a minute';
  if (lo === hi) return `about ${lo} min`;
  return `${lo}–${hi} min`;
}

/** Equirectangular projection around a reference latitude (metres). */
export function projectM(p: LatLng, origin: LatLng): { x: number; y: number } {
  const x = toRad(p.lng - origin.lng) * R * Math.cos(toRad(origin.lat));
  const y = toRad(p.lat - origin.lat) * R;
  return { x, y };
}

/** Moves a point by a distance (m) along a bearing (deg). */
export function offset(p: LatLng, distance: number, bearing: number): LatLng {
  const δ = distance / R;
  const θ = toRad(bearing);
  const φ1 = toRad(p.lat);
  const λ1 = toRad(p.lng);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: toDeg(φ2), lng: toDeg(λ2) };
}

/** Circular mean of angles in degrees (for smoothing compass readings). */
export function circularMean(degs: number[]): number | null {
  if (degs.length === 0) return null;
  let s = 0;
  let c = 0;
  for (const d of degs) {
    s += Math.sin(toRad(d));
    c += Math.cos(toRad(d));
  }
  if (Math.abs(s) < 1e-9 && Math.abs(c) < 1e-9) return null;
  return normalizeDeg(toDeg(Math.atan2(s, c)));
}

/** Rough bounding box of the Autonomous City of Buenos Aires (plus margin). */
export const BUENOS_AIRES_BOUNDS = { minLat: -34.71, maxLat: -34.52, minLng: -58.54, maxLng: -58.33 };

export function isInBuenosAires(p: LatLng): boolean {
  const b = BUENOS_AIRES_BOUNDS;
  return p.lat >= b.minLat && p.lat <= b.maxLat && p.lng >= b.minLng && p.lng <= b.maxLng;
}
