import { signal } from '@preact/signals';

/** Keeps the screen on while navigating, if the players ask for it. */
export const wakeLockActive = signal(false);

let sentinel: WakeLockSentinel | null = null;
let wanted = false;

export function wakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

async function acquire(): Promise<void> {
  if (!wakeLockSupported() || sentinel || document.visibilityState !== 'visible') return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    wakeLockActive.value = true;
    sentinel.addEventListener('release', () => {
      sentinel = null;
      wakeLockActive.value = false;
    });
  } catch {
    wakeLockActive.value = false;
  }
}

export function setWakeLock(on: boolean): void {
  wanted = on;
  if (on) void acquire();
  else if (sentinel) {
    void sentinel.release().catch(() => undefined);
    sentinel = null;
    wakeLockActive.value = false;
  }
}

if (typeof document !== 'undefined') {
  // The lock is dropped when the page is hidden; take it back when visible again.
  document.addEventListener('visibilitychange', () => {
    if (wanted && document.visibilityState === 'visible') void acquire();
  });
}
