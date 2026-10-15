import { expect, test } from '@playwright/test';
import { cacheStatus, startTour, waitForOfflineReady, watchErrors } from './helpers';

/**
 * The offline lifecycle: first load caches the whole app (including all
 * narration), then with the network cut the app reloads, restores progress,
 * plays narration, checks answers, gives hints, moves between chapters, and
 * reopens in a fresh tab.
 */
test('works fully offline after the first visit', async ({ page, context }) => {
  test.setTimeout(150_000);
  const errors = watchErrors(page);

  await startTour(page);
  await waitForOfflineReady(page);
  const status = await cacheStatus(page);
  expect(status!.missing).toEqual([]);
  // The precache includes every narration file and sound effect.
  const urls: string[] = await page.evaluate(async () => {
    const keys = await caches.keys();
    const out: string[] = [];
    for (const k of keys) for (const r of await (await caches.open(k)).keys()) out.push(r.url);
    return out;
  });
  expect(urls.filter((u) => u.includes('/audio/narration/')).length).toBe(22);
  expect(urls.filter((u) => u.includes('/audio/sfx/')).length).toBe(8);

  // Make some progress, then go offline.
  await page.getByRole('button', { name: /Start the challenge/ }).click();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('Gall');
  await context.setOffline(true);

  // Refresh while offline: same screen, same draft answer.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Read the corner' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue('Gall');
  await expect(page.getByRole('img', { name: /Offline/ }).or(page.getByText('Offline', { exact: true })).first()).toBeVisible();

  // Hints and answer checking work offline.
  await page.getByRole('button', { name: /Need a nudge/ }).click();
  await expect(page.getByText('Hint 1:')).toBeVisible();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('Gallo');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('img', { name: 'Solved' })).toBeVisible();

  // Narration plays offline from the cache.
  await page.getByRole('button', { name: /Listen: Gallo/ }).click();
  await expect(page.getByRole('region', { name: 'Narration player' })).toBeVisible();
  await expect
    .poll(async () => page.locator('.player__sub').innerText(), { timeout: 15_000 })
    .toMatch(/^0:0[1-9]|^0:[1-9]\d/);

  // Every chapter screen opens offline.
  for (const id of ['key', 'architects', 'foundings', 'arches', 'fever', 'colours', 'garden', 'flower', 'finale']) {
    await page.goto(`./#/chapter/${id}`);
    await expect(page.locator('h2').first()).toBeVisible();
  }
  for (const r of ['route', 'journal', 'settings', 'help']) {
    await page.goto(`./#/${r}`);
    await expect(page.locator('h2').first()).toBeVisible();
  }

  // Close the app and open it again, still offline.
  await page.close();
  const again = await context.newPage();
  const errors2 = watchErrors(again);
  await again.goto('./');
  await expect(again.getByText(/Prologue|Chapter/).first()).toBeVisible();
  await again.goto('./#/journal/threads');
  await expect(again.locator('blockquote.thread')).toHaveCount(1);

  await context.setOffline(false);
  expect([...errors, ...errors2].filter((e) => !/net::ERR_INTERNET_DISCONNECTED/.test(e))).toEqual([]);
});
