import { signal } from '@preact/signals';

/** Whether the browser believes it is online. The app works the same either way. */
export const online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => (online.value = true));
  window.addEventListener('offline', () => (online.value = false));
}
