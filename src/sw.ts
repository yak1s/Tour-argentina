/// <reference lib="webworker" />
/**
 * Service worker: precaches the entire app — HTML, scripts, styles, fonts,
 * artwork, narration and sound effects — at install time, then serves
 * everything from the cache. The game makes no network requests of its own,
 * so once installed it works with no connection at all.
 */
import { cleanupOutdatedCaches, createHandlerBoundToURL, getCacheKeyForURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { cacheNames, clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null } | string>;
};

const manifest = self.__WB_MANIFEST;

precacheAndRoute(manifest);
cleanupOutdatedCaches();

// Every in-app navigation (including a refresh while offline) gets the app shell.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// Take control of open pages as soon as the first install finishes, so the
// very first visit is already protected against going offline.
clientsClaim();

interface CacheStatus {
  type: 'CACHE_STATUS';
  total: number;
  cached: number;
  missing: string[];
  cacheName: string;
}

async function cacheStatus(): Promise<CacheStatus> {
  const cache = await caches.open(cacheNames.precache);
  const keys = new Set((await cache.keys()).map((r) => r.url));
  let cached = 0;
  const missing: string[] = [];
  for (const entry of manifest) {
    const url = typeof entry === 'string' ? entry : entry.url;
    const key = getCacheKeyForURL(url) ?? new URL(url, self.location.href).href;
    if (keys.has(key)) cached++;
    else missing.push(url);
  }
  return { type: 'CACHE_STATUS', total: manifest.length, cached, missing: missing.slice(0, 25), cacheName: cacheNames.precache };
}

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as { type?: string } | undefined;
  if (data?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  } else if (data?.type === 'CACHE_STATUS') {
    const port = event.ports[0];
    event.waitUntil(
      cacheStatus()
        .then((status) => port?.postMessage(status))
        .catch((err: unknown) => port?.postMessage({ type: 'CACHE_STATUS_ERROR', message: String(err) })),
    );
  }
});
