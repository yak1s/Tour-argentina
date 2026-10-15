import { expect, test } from '@playwright/test';
import { noHorizontalOverflow, startTour, watchErrors } from './helpers';

test.describe('audio', () => {
  test('one narration at a time, with pause, resume and mute', async ({ page }) => {
    const errors = watchErrors(page);
    await startTour(page);
    await page.getByRole('button', { name: /Listen: Good morning, you two/ }).click();
    const player = page.getByRole('region', { name: 'Narration player' });
    await expect(player.getByText('Good morning, you two')).toBeVisible();
    await expect.poll(async () => page.locator('.player__sub').innerText(), { timeout: 15_000 }).toMatch(/^0:0[1-9]/);

    // Starting a second clip replaces the first.
    await page.getByRole('button', { name: /Listen: A warm-up/ }).click();
    await expect(player.getByText('A warm-up')).toBeVisible();
    await expect(player.getByText('Good morning, you two')).toHaveCount(0);
    const playing = await page.evaluate(() => {
      // Only one narration channel exists; make sure nothing else is producing sound.
      return Array.from(document.querySelectorAll('audio')).filter((a) => !a.paused).length;
    });
    expect(playing).toBe(0); // the narration element is not attached to the DOM; no stray <audio> plays

    // Pause / resume.
    await page.getByRole('button', { name: 'Pause narration' }).click();
    const t1 = await page.locator('.player__sub').innerText();
    await page.waitForTimeout(1200);
    expect(await page.locator('.player__sub').innerText()).toBe(t1);
    await page.getByRole('button', { name: 'Play narration' }).click();
    await expect.poll(async () => page.locator('.player__sub').innerText(), { timeout: 10_000 }).not.toBe(t1);

    // Mute from the player.
    await page.getByRole('button', { name: 'Mute' }).click();
    await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible();

    // The narration keeps playing across screens, and the player stays.
    await page.goto('./#/route');
    await expect(player).toBeVisible();
    await page.getByRole('button', { name: 'Close player' }).click();
    await expect(player).toHaveCount(0);

    // Transcripts are always available.
    await page.goto('./#/chapter/prologue');
    await page.getByText('Transcript').first().click();
    await expect(page.getByText(/I watched them arrive/)).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('manual mode (no GPS)', () => {
  test('location denied: directions, manual arrival and challenges still work', async ({ page }) => {
    const errors = watchErrors(page);
    await startTour(page, { location: true });
    await page.goto('./#/go/key');
    await expect(page.getByText(/Location is blocked|No position yet|Turn on location/).first()).toBeVisible();
    await expect(page.getByText('Recommended: taxi.')).toBeVisible();
    await page.getByRole('button', { name: 'Show the driver (in Spanish)' }).click();
    await expect(page.getByText('Ayacucho 1412, entre Juncal y Pacheco de Melo, por favor.')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'We’re here' }).click();
    await expect(page.getByRole('heading', { name: 'The Key', level: 2 })).toBeVisible();
    await expect(page.getByText('A battle in the Andes')).toBeVisible();
    expect(errors.filter((e) => !/geolocation|permission/i.test(e))).toEqual([]);
  });

  test('a challenge can be opened from anywhere when a place is closed, and skipped', async ({ page }) => {
    await startTour(page);
    await page.goto('./#/puzzle/p-tiles');
    await expect(page.getByRole('heading', { name: 'The tiles of Seville' })).toBeVisible();
    await page.getByRole('button', { name: /Need a nudge/ }).click();
    await page.getByRole('button', { name: /Need a nudge/ }).click();
    await page.getByRole('button', { name: /Need a nudge/ }).click();
    await expect(page.getByText(/last hint all but gives it away/)).toBeVisible();
    await page.getByRole('button', { name: /last hint/ }).click();
    await expect(page.getByText('Hint 3:')).toBeVisible();
    await page.getByRole('button', { name: 'Skip this challenge' }).click();
    await page.getByRole('button', { name: 'Skip and show the answer' }).click();
    await expect(page.getByRole('img', { name: 'Skipped' })).toBeVisible();
    await expect(page.getByText(/The answer: Don Quixote/)).toBeVisible();
  });
});

test.describe('route control', () => {
  test('pause, reorder, choose another stop, and return to the planned route', async ({ page }) => {
    await startTour(page);
    await page.goto('./#/');
    await page.getByRole('button', { name: 'Pause for a break' }).click();
    await expect(page.getByRole('heading', { name: 'Take your time' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Take your time' })).toBeVisible();
    await page.getByRole('button', { name: 'Resume the tour' }).click();

    await page.goto('./#/route');
    await page.getByRole('button', { name: 'Options for El Rosedal' }).click();
    await page.getByRole('button', { name: 'Later' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
    const titles = await page.locator('.tl-title').allInnerTexts();
    expect(titles.indexOf('El Rosedal')).toBeGreaterThan(titles.indexOf('Floralis Genérica'));
    await expect(page.getByRole('button', { name: 'Return to the planned route' })).toBeVisible();

    await page.getByRole('button', { name: 'Options for Obelisco' }).click();
    await page.getByRole('button', { name: 'Go here next' }).click();
    await expect(page.getByRole('heading', { name: 'Obelisco' })).toBeVisible();
    await page.goto('./#/route');
    await page.getByRole('button', { name: 'Return to the planned route' }).click();
    const restored = await page.locator('.tl-title').allInnerTexts();
    expect(restored.indexOf('El Rosedal')).toBeLessThan(restored.indexOf('Floralis Genérica'));
  });
});

test.describe('layout', () => {
  test('no horizontal scrolling on a 320 px phone', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await startTour(page);
    for (const r of ['', 'chapter/prologue', 'go/key', 'route', 'journal', 'journal/challenges', 'settings', 'help', 'puzzle/p-architects', 'puzzle/p-message', 'puzzle/p-voice', 'puzzle/p-key', 'puzzle/p-tale', 'finale']) {
      await page.goto(`./#/${r}`);
      await page.waitForTimeout(250);
      await noHorizontalOverflow(page);
    }
    await context.close();
  });

  test('sunlight theme, larger text and reduced motion apply', async ({ page }) => {
    await startTour(page);
    await page.goto('./#/settings');
    await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Sunlight' }).click();
    await page.getByRole('group', { name: 'Text size' }).getByRole('button', { name: 'A++' }).click();
    await page.getByRole('group', { name: 'Motion' }).getByRole('button', { name: 'Less' }).click();
    const attrs = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      motion: document.documentElement.dataset.motion,
      scale: document.documentElement.style.getPropertyValue('--text-scale'),
    }));
    expect(attrs).toEqual({ theme: 'sun', motion: 'reduce', scale: '1.25' });
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('sun');
  });
});

test.describe('assets and install', () => {
  test('manifest, icons and every precached file resolve under the GitHub Pages sub-path', async ({ page, request }) => {
    await page.goto('./');
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBe('./manifest.webmanifest');
    const manifestUrl = new URL(manifestHref!, page.url()).href;
    const manifest = await (await request.get(manifestUrl)).json();
    expect(manifest.display).toBe('standalone');
    expect(new URL(manifest.start_url, manifestUrl).pathname).toBe('/Tour-argentina/');
    for (const icon of manifest.icons) {
      const res = await request.get(new URL(icon.src, manifestUrl).href);
      expect(res.status(), icon.src).toBe(200);
    }
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);

    // Read the precache list from the built service worker and fetch every entry.
    const sw = await (await request.get(new URL('sw.js', page.url()).href)).text();
    const entries = Array.from(sw.matchAll(/"?url"?:"([^"]+)"/g)).map((m) => m[1]!);
    expect(entries.length).toBeGreaterThan(40);
    for (const e of entries) {
      const res = await request.get(new URL(e, page.url()).href);
      expect(res.status(), e).toBe(200);
    }
  });
});
