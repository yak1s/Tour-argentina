import { signal } from '@preact/signals';
import { Workbox } from 'workbox-window';

/**
 * Service-worker registration, offline-pack status, updates and the install
 * prompt. In development (vite dev server) no service worker is registered.
 */
export type SwState = 'unsupported' | 'registering' | 'installing' | 'ready' | 'error' | 'dev';

export interface OfflinePack {
  total: number;
  cached: number;
  missing: string[];
  checkedAt: number;
}

export const swState = signal<SwState>('registering');
export const offlinePack = signal<OfflinePack | null>(null);
export const updateReady = signal(false);
export const canPromptInstall = signal(false);
export const isStandalone = signal(false);

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let wb: Workbox | null = null;
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let pollTimer: ReturnType<typeof setInterval> | undefined;

function detectStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Asks the service worker which files of the offline pack are cached. */
export async function checkOfflinePack(timeoutMs = 5000): Promise<OfflinePack | null> {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  const worker = reg?.active ?? reg?.waiting ?? reg?.installing;
  if (!worker) return null;
  const result = await new Promise<OfflinePack | null>((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), timeoutMs);
    channel.port1.onmessage = (e: MessageEvent) => {
      clearTimeout(timer);
      const d = e.data as { type: string; total: number; cached: number; missing: string[] };
      resolve(d?.type === 'CACHE_STATUS' ? { total: d.total, cached: d.cached, missing: d.missing, checkedAt: Date.now() } : null);
    };
    worker.postMessage({ type: 'CACHE_STATUS' }, [channel.port2]);
  });
  if (result) offlinePack.value = result;
  return result;
}

function startPolling(): void {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    const pack = await checkOfflinePack(3000);
    if (pack && pack.total > 0 && pack.cached >= pack.total) {
      clearInterval(pollTimer);
      pollTimer = undefined;
      swState.value = 'ready';
    }
  }, 1200);
}

export function registerServiceWorker(): void {
  isStandalone.value = detectStandalone();
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', () => (isStandalone.value = detectStandalone()));

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    canPromptInstall.value = true;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    canPromptInstall.value = false;
    isStandalone.value = true;
  });

  if (import.meta.env.DEV) {
    swState.value = 'dev';
    return;
  }
  if (!('serviceWorker' in navigator)) {
    swState.value = 'unsupported';
    return;
  }
  wb = new Workbox('./sw.js', { scope: './' });
  wb.addEventListener('installed', (event) => {
    if (!event.isUpdate) startPolling();
  });
  wb.addEventListener('waiting', () => {
    updateReady.value = true;
  });
  wb.addEventListener('controlling', (event) => {
    if (event.isUpdate) window.location.reload();
  });
  wb.register()
    .then(async (reg) => {
      if (reg?.installing) swState.value = 'installing';
      const pack = await checkOfflinePack();
      if (pack && pack.cached >= pack.total && pack.total > 0) swState.value = 'ready';
      else {
        swState.value = 'installing';
        startPolling();
      }
    })
    .catch(() => {
      swState.value = 'error';
    });
}

/** Activates a downloaded update (the page reloads once the new version takes over). */
export function applyUpdate(): void {
  if (!wb) return;
  wb.messageSkipWaiting();
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  canPromptInstall.value = false;
  return choice.outcome;
}
