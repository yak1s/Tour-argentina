import { signal } from '@preact/signals';

/**
 * Elevation angle of the rear camera's line of sight, from the device's
 * front-to-back tilt (DeviceOrientationEvent.beta). Holding the phone upright
 * gives 0°; tipping the camera up towards the sky increases it. Used only by
 * the optional "surveyor's challenge" at the Obelisco.
 */
export const elevationDeg = signal<number | null>(null);
export const tiltStatus = signal<'off' | 'active' | 'unavailable' | 'needs-permission'>('off');

let handler: ((e: DeviceOrientationEvent) => void) | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

export async function startTilt(): Promise<void> {
  if (handler) return;
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
    tiltStatus.value = 'unavailable';
    return;
  }
  const Ctor = window.DeviceOrientationEvent as OrientationCtor;
  if (typeof Ctor.requestPermission === 'function') {
    try {
      if ((await Ctor.requestPermission()) !== 'granted') {
        tiltStatus.value = 'needs-permission';
        return;
      }
    } catch {
      tiltStatus.value = 'needs-permission';
      return;
    }
  }
  let got = false;
  handler = (e: DeviceOrientationEvent) => {
    if (e.beta === null) return;
    got = true;
    tiltStatus.value = 'active';
    // beta = 90 when the phone is upright; the camera then looks at the horizon.
    elevationDeg.value = Math.round((e.beta - 90) * 10) / 10;
  };
  window.addEventListener('deviceorientation', handler);
  timer = setTimeout(() => {
    if (!got) {
      stopTilt();
      tiltStatus.value = 'unavailable';
    }
  }, 3_000);
}

export function stopTilt(): void {
  if (handler) window.removeEventListener('deviceorientation', handler);
  handler = null;
  if (timer) clearTimeout(timer);
  elevationDeg.value = null;
  if (tiltStatus.value === 'active') tiltStatus.value = 'off';
}

/** Height estimate: eye height plus distance × tan(elevation). */
export function estimateHeight(distanceM: number, elevation: number, eyeHeightM = 1.5): number {
  return eyeHeightM + distanceM * Math.tan((elevation * Math.PI) / 180);
}
