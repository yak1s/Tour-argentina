import { expect, type BrowserContext, type Page } from '@playwright/test';
import { WAYPOINTS } from '../../src/content/waypoints';
import type { WaypointId } from '../../src/content/types';

/** Collects console errors and uncaught exceptions so tests can assert there are none. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

export async function startTour(page: Page, opts: { location?: boolean } = {}): Promise<void> {
  await page.goto('./');
  await page.getByRole('button', { name: 'Open the journal' }).click();
  if (opts.location) await page.getByRole('switch', { name: 'Use location' }).click();
  await page.getByRole('button', { name: /begin/i }).click();
  await expect(page.getByRole('heading', { name: 'The Corner' })).toBeVisible();
}

/** Asks the service worker how much of the offline pack is cached. */
export async function cacheStatus(page: Page): Promise<{ total: number; cached: number; missing: string[] } | null> {
  return page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const worker = reg?.active ?? reg?.waiting ?? reg?.installing;
    if (!worker) return null;
    return await new Promise((resolve) => {
      const ch = new MessageChannel();
      const t = setTimeout(() => resolve(null), 4000);
      ch.port1.onmessage = (e) => {
        clearTimeout(t);
        resolve(e.data);
      };
      worker.postMessage({ type: 'CACHE_STATUS' }, [ch.port2]);
    });
  });
}

export async function waitForOfflineReady(page: Page): Promise<void> {
  await expect
    .poll(
      async () => {
        const s = await cacheStatus(page);
        return s && s.total > 0 && s.cached === s.total && (await page.evaluate(() => Boolean(navigator.serviceWorker.controller)));
      },
      { timeout: 60_000, intervals: [500, 1000] },
    )
    .toBe(true);
}

export async function moveTo(context: BrowserContext, id: WaypointId, accuracy = 8): Promise<void> {
  const { lat, lng } = WAYPOINTS[id].coords;
  await context.setGeolocation({ latitude: lat, longitude: lng, accuracy });
}

export async function openChallenge(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Start the challenge|Back to the challenge/ }).click();
}

export async function expectSolved(page: Page): Promise<void> {
  await expect(page.getByRole('img', { name: 'Solved' })).toBeVisible();
}

export async function continueToNext(page: Page, nextName: RegExp): Promise<void> {
  await page.getByRole('link', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Open the narrator’s note' }).click();
  await page.getByRole('button', { name: nextName }).click();
}

export async function noHorizontalOverflow(page: Page): Promise<void> {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(sw, 'page should not scroll horizontally').toBeLessThanOrEqual(cw);
}
