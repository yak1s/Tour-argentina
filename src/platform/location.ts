import { signal } from '@preact/signals';
import type { Fix } from '../geo/arrival';

/**
 * Geolocation, used only on the device. Positions are never sent anywhere.
 *
 * status:
 *  - 'off'          the players haven't turned location on (manual mode)
 *  - 'unsupported'  no Geolocation API
 *  - 'requesting'   waiting for the permission prompt / first fix
 *  - 'active'       receiving positions
 *  - 'denied'       permission refused (manual mode; can be changed in browser settings)
 *  - 'unavailable'  the device can't get a fix right now (indoors, no signal)
 */
export type LocationStatus = 'off' | 'unsupported' | 'requesting' | 'active' | 'denied' | 'unavailable';

export const locationStatus = signal<LocationStatus>('off');
export const position = signal<Fix | null>(null);
/** 'granted' | 'prompt' | 'denied' | 'unknown' from the Permissions API, without prompting. */
export const locationPermission = signal<PermissionState | 'unknown'>('unknown');

let watchId: number | null = null;
let staleTimer: ReturnType<typeof setTimeout> | undefined;

export function geolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

export async function queryLocationPermission(): Promise<void> {
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
    if (!status) return;
    locationPermission.value = status.state;
    status.onchange = () => {
      locationPermission.value = status.state;
      if (status.state === 'denied') {
        stopLocation();
        locationStatus.value = 'denied';
      }
    };
  } catch {
    locationPermission.value = 'unknown';
  }
}

function onFix(p: GeolocationPosition): void {
  position.value = {
    lat: p.coords.latitude,
    lng: p.coords.longitude,
    accuracy: p.coords.accuracy,
    timestamp: p.timestamp || Date.now(),
  };
  locationStatus.value = 'active';
  if (staleTimer) clearTimeout(staleTimer);
  // If no new fix arrives for a while, say so instead of pretending the old one is current.
  staleTimer = setTimeout(() => {
    if (watchId !== null) locationStatus.value = 'unavailable';
  }, 45_000);
}

function onError(err: GeolocationPositionError): void {
  if (err.code === err.PERMISSION_DENIED) {
    stopLocation();
    locationStatus.value = 'denied';
    locationPermission.value = 'denied';
    return;
  }
  // POSITION_UNAVAILABLE or TIMEOUT: keep watching; the next fix may succeed.
  if (locationStatus.value !== 'active') locationStatus.value = 'unavailable';
}

/** Starts watching the position. Call from a user action so the permission prompt has context. */
export function startLocation(): void {
  if (!geolocationSupported()) {
    locationStatus.value = 'unsupported';
    return;
  }
  if (watchId !== null) return;
  locationStatus.value = position.value ? 'active' : 'requesting';
  try {
    watchId = navigator.geolocation.watchPosition(onFix, onError, {
      enableHighAccuracy: true,
      maximumAge: 5_000,
      timeout: 30_000,
    });
  } catch {
    locationStatus.value = 'unavailable';
  }
}

export function stopLocation(): void {
  if (watchId !== null && geolocationSupported()) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  if (staleTimer) clearTimeout(staleTimer);
  if (locationStatus.value === 'active' || locationStatus.value === 'requesting' || locationStatus.value === 'unavailable') {
    locationStatus.value = 'off';
  }
}

export function isWatching(): boolean {
  return watchId !== null;
}

/** Age of the latest fix in seconds, or null. */
export function fixAgeSec(now = Date.now()): number | null {
  const p = position.value;
  return p ? Math.max(0, Math.round((now - p.timestamp) / 1000)) : null;
}
