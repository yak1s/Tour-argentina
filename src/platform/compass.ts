import { signal } from '@preact/signals';
import { circularMean, normalizeDeg, angleDiff } from '../geo/math';

/**
 * Optional compass heading from device orientation sensors.
 *
 * Android Chrome exposes an absolute orientation event; iOS Safari exposes
 * webkitCompassHeading after an explicit permission request. Both are
 * relative to magnetic north, so we add Buenos Aires' magnetic declination
 * (about 9° west) to point at true north. Readings are smoothed, and we flag
 * erratic readings so the UI can suggest calibrating (figure-eight motion).
 */
export type CompassStatus = 'off' | 'needs-permission' | 'starting' | 'active' | 'unavailable';

/** Approximate magnetic declination for Buenos Aires (negative = west). */
export const DECLINATION_DEG = -9;

export const compassStatus = signal<CompassStatus>('off');
/** Smoothed heading in degrees from true north (clockwise), or null. */
export const heading = signal<number | null>(null);
/** True when recent readings are erratic. */
export const compassUnsteady = signal(false);

const recent: number[] = [];
let listening: null | { type: string; fn: (e: Event) => void } = null;
let gotReading = false;
let startTimer: ReturnType<typeof setTimeout> | undefined;

type IOSOrientationEvent = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

export function compassSupported(): boolean {
  return typeof window !== 'undefined' && ('ondeviceorientationabsolute' in window || 'DeviceOrientationEvent' in window);
}

function screenAngle(): number {
  const a = (screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle : (window as unknown as { orientation?: number }).orientation) ?? 0;
  return Number(a) || 0;
}

function push(magneticHeading: number): void {
  const trueHeading = normalizeDeg(magneticHeading + DECLINATION_DEG + screenAngle());
  recent.push(trueHeading);
  if (recent.length > 8) recent.shift();
  const mean = circularMean(recent);
  heading.value = mean === null ? null : Math.round(mean);
  if (recent.length >= 6 && mean !== null) {
    const spread = Math.max(...recent.map((r) => Math.abs(angleDiff(r, mean))));
    compassUnsteady.value = spread > 40;
  }
  if (!gotReading) {
    gotReading = true;
    compassStatus.value = 'active';
  }
}

function handleAbsolute(e: Event): void {
  const ev = e as DeviceOrientationEvent;
  if (ev.alpha === null || ev.alpha === undefined) return;
  // alpha grows counter-clockwise; compass headings grow clockwise.
  push(360 - ev.alpha);
}

function handleIOS(e: Event): void {
  const ev = e as IOSOrientationEvent;
  if (typeof ev.webkitCompassHeading === 'number' && ev.webkitCompassHeading >= 0) {
    push(ev.webkitCompassHeading);
    if (typeof ev.webkitCompassAccuracy === 'number') compassUnsteady.value = ev.webkitCompassAccuracy < 0 || ev.webkitCompassAccuracy > 30;
  } else if (ev.absolute && ev.alpha !== null) {
    push(360 - ev.alpha);
  }
}

/** Starts the compass. Must be called from a user gesture on iOS. */
export async function startCompass(): Promise<void> {
  if (listening) return;
  if (!compassSupported()) {
    compassStatus.value = 'unavailable';
    return;
  }
  const Ctor = (window as unknown as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent;
  if (Ctor && typeof Ctor.requestPermission === 'function') {
    try {
      const result = await Ctor.requestPermission();
      if (result !== 'granted') {
        compassStatus.value = 'needs-permission';
        return;
      }
    } catch {
      compassStatus.value = 'needs-permission';
      return;
    }
    listening = { type: 'deviceorientation', fn: handleIOS };
  } else if ('ondeviceorientationabsolute' in window) {
    listening = { type: 'deviceorientationabsolute', fn: handleAbsolute };
  } else {
    listening = { type: 'deviceorientation', fn: handleIOS };
  }
  gotReading = false;
  compassStatus.value = 'starting';
  window.addEventListener(listening.type, listening.fn);
  // If nothing arrives within a few seconds, the device has no usable compass.
  if (startTimer) clearTimeout(startTimer);
  startTimer = setTimeout(() => {
    if (!gotReading) {
      stopCompass();
      compassStatus.value = 'unavailable';
    }
  }, 4_000);
}

export function stopCompass(): void {
  if (listening) window.removeEventListener(listening.type, listening.fn);
  listening = null;
  recent.length = 0;
  heading.value = null;
  if (startTimer) clearTimeout(startTimer);
  if (compassStatus.value !== 'unavailable' && compassStatus.value !== 'needs-permission') compassStatus.value = 'off';
}
