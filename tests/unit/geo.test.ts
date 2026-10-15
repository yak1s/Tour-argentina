import { describe, expect, it } from 'vitest';
import { angleDiff, bearingDeg, circularMean, compassWord, distanceM, formatDistance, isInBuenosAires, offset, walkingMinutesRange } from '../../src/geo/math';
import { ArrivalDetector } from '../../src/geo/arrival';
import { WAYPOINTS } from '../../src/content';

describe('geo math', () => {
  const colon = WAYPOINTS.colon.coords;
  const obelisco = WAYPOINTS.obelisco.coords;

  it('computes distance and bearing between verified points', () => {
    const d = distanceM(colon, obelisco);
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(420);
    const b = bearingDeg(colon, obelisco);
    expect(b).toBeGreaterThan(130);
    expect(b).toBeLessThan(170);
    expect(compassWord(b)).toBe('southeast');
  });

  it('round-trips offsets', () => {
    const p = offset(obelisco, 500, 45);
    expect(distanceM(obelisco, p)).toBeCloseTo(500, 0);
    expect(bearingDeg(obelisco, p)).toBeCloseTo(45, 0);
  });

  it('averages angles across north', () => {
    expect(circularMean([350, 10])).toBeCloseTo(0, 5);
    expect(circularMean([])).toBeNull();
    expect(angleDiff(10, 350)).toBe(20);
    expect(angleDiff(350, 10)).toBe(-20);
  });

  it('formats distances without false precision', () => {
    expect(formatDistance(12)).toBe('a few metres');
    expect(formatDistance(57)).toBe('55 m');
    expect(formatDistance(347)).toBe('350 m');
    expect(formatDistance(2345)).toBe('2.3 km');
    expect(formatDistance(12_600)).toBe('13 km');
  });

  it('turns straight lines into realistic walking ranges', () => {
    const [lo, hi] = walkingMinutesRange(1000);
    expect(lo).toBeGreaterThanOrEqual(15);
    expect(hi).toBeGreaterThan(lo);
  });

  it('knows the city bounds', () => {
    expect(isInBuenosAires(obelisco)).toBe(true);
    expect(isInBuenosAires({ lat: 40.7, lng: -74 })).toBe(false);
  });
});

describe('arrival detection', () => {
  const target = WAYPOINTS.obelisco.coords;
  const near = offset(target, 30, 90);
  const far = offset(target, 400, 90);

  it('needs two consistent fixes inside the radius', () => {
    const d = new ArrivalDetector(target, { radiusM: 70 });
    expect(d.push({ ...near, accuracy: 25, timestamp: 1000 }).arrived).toBe(false);
    expect(d.push({ ...near, accuracy: 25, timestamp: 6000 }).arrived).toBe(true);
  });

  it('accepts a single very precise fix well inside the radius', () => {
    const d = new ArrivalDetector(target, { radiusM: 70 });
    const centre = offset(target, 10, 0);
    expect(d.push({ ...centre, accuracy: 8, timestamp: 1000 }).arrived).toBe(true);
  });

  it('ignores inaccurate fixes and far fixes', () => {
    const d = new ArrivalDetector(target, { radiusM: 70 });
    d.push({ ...near, accuracy: 300, timestamp: 1000 });
    d.push({ ...near, accuracy: 300, timestamp: 2000 });
    expect(d.arrived).toBe(false);
    d.push({ ...far, accuracy: 10, timestamp: 3000 });
    const r = d.push({ ...far, accuracy: 10, timestamp: 4000 });
    expect(r.arrived).toBe(false);
    expect(r.proximity).toBe('approaching');
  });

  it('forgets hits outside the time window', () => {
    const d = new ArrivalDetector(target, { radiusM: 70, windowMs: 10_000 });
    d.push({ ...near, accuracy: 25, timestamp: 0 });
    expect(d.push({ ...near, accuracy: 25, timestamp: 60_000 }).arrived).toBe(false);
  });

  it('stays arrived when GPS drifts away again', () => {
    const d = new ArrivalDetector(target, { radiusM: 70 });
    d.push({ ...near, accuracy: 20, timestamp: 1 });
    d.push({ ...near, accuracy: 20, timestamp: 2 });
    expect(d.push({ ...far, accuracy: 20, timestamp: 3 }).arrived).toBe(true);
  });

  it('ignores fixes that go back in time', () => {
    const d = new ArrivalDetector(target, { radiusM: 70 });
    d.push({ ...far, accuracy: 20, timestamp: 5000 });
    const r = d.push({ ...near, accuracy: 5, timestamp: 1000 });
    expect(r.arrived).toBe(false);
  });

  it('reports a helpful note for imprecise fixes', () => {
    const d = new ArrivalDetector(target, { radiusM: 70 });
    const r = d.push({ ...near, accuracy: 150, timestamp: 1 });
    expect(r.note).toMatch(/imprecise/);
  });
});
