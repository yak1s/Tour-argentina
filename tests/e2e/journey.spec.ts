import { expect, test } from '@playwright/test';
import { continueToNext, expectSolved, moveTo, openChallenge, startTour, watchErrors } from './helpers';

/**
 * The whole day, end to end, with simulated GPS: every stop, every challenge
 * type, wrong answers, hints, a skipped stop, a reload in the middle, and the
 * finale. Verified waypoints are confirmed by GPS automatically; approximate
 * ones are suggested and confirmed by the players.
 */
test('complete journey from Córdoba y Gallo back to Córdoba y Gallo', async ({ page, context }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await context.grantPermissions(['geolocation']);
  await moveTo(context, 'start');

  // Prologue at the starting corner.
  await startTour(page, { location: true });
  await openChallenge(page);
  const answer = page.getByRole('textbox', { name: 'Your answer' });
  await answer.fill('Córdoba');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'avenue' })).toBeVisible();
  await page.getByRole('button', { name: /Need a nudge/ }).click();
  await expect(page.getByText('Hint 1:')).toBeVisible();
  await answer.fill('Gallo');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expectSolved(page);
  await continueToNext(page, /On to Ayacucho 1412/);

  // Chapter 1 — Ayacucho 1412 (approximate position: the app suggests, we confirm).
  await expect(page.getByRole('heading', { name: 'Ayacucho 1412' })).toBeVisible();
  await expect(page.getByText('Show the driver (in Spanish)')).toBeVisible();
  await moveTo(context, 'ayacucho');
  await expect(page.getByText(/Looks like you’re close to Ayacucho 1412/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'We’re here' }).first().click();
  await expect(page.getByRole('heading', { name: 'The Key', level: 2 })).toBeVisible();
  await openChallenge(page);
  await page.getByRole('textbox', { name: 'Type the code' }).fill('2141');
  await page.getByRole('button', { name: 'Enter' }).click();
  await page.getByRole('textbox', { name: 'Type the code' }).fill('1412');
  await page.getByRole('button', { name: 'Enter' }).click();
  await expectSolved(page);
  await continueToNext(page, /On to Teatro Colón/);

  // Chapter 2 — Teatro Colón (verified position: GPS confirms arrival).
  await moveTo(context, 'colon');
  await expect(page.getByText(/You’ve arrived: Teatro Colón/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Begin' }).click();
  await openChallenge(page);
  const placeIn = async (name: string, slot: number) => {
    await page.getByRole('button', { name: new RegExp(name) }).first().click();
    await page.locator('.slot').nth(slot).click();
  };
  await placeIn('Jules Dormal', 0);
  await placeIn('Francesco Tamburini', 1);
  await placeIn('Vittorio Meano', 2);
  await page.getByRole('button', { name: 'Check the order' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'in the right place' })).toBeVisible();
  await placeIn('Francesco Tamburini', 0);
  await placeIn('Vittorio Meano', 1);
  await placeIn('Jules Dormal', 2);
  await page.getByRole('button', { name: 'Check the order' }).click();
  await expectSolved(page);

  // Reload in the middle of the day: everything must come back.
  await page.reload();
  await expectSolved(page);
  await continueToNext(page, /On to Obelisco/);

  // Chapter 3 — Obelisco.
  await moveTo(context, 'obelisco');
  await expect(page.getByText(/You’ve arrived: Obelisco/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Begin' }).click();
  await openChallenge(page);
  await page.getByRole('textbox', { name: 'Your answer' }).fill('39');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('status').filter({ hasText: '1541' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('forty-four');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expectSolved(page);
  await continueToNext(page, /On to Plaza de Mayo/);

  // Chapter 4 — Plaza de Mayo.
  await moveTo(context, 'plaza-de-mayo');
  await expect(page.getByText(/You’ve arrived: Plaza de Mayo/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Begin' }).click();
  await openChallenge(page);
  await page.getByRole('textbox', { name: 'Your answer' }).fill('5');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'left' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('6');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expectSolved(page);
  await continueToNext(page, /On to Mercado de San Telmo/);

  // Chapter 5 — San Telmo: the cipher with the key from chapter 1.
  await moveTo(context, 'san-telmo');
  await expect(page.getByText(/Looks like you’re close to Mercado de San Telmo/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'We’re here' }).first().click();
  await openChallenge(page);
  await page.getByLabel(/First, enter your key/).fill('1111');
  await page.getByRole('button', { name: 'Use key' }).click();
  await expect(page.getByText(/That’s not the key/)).toBeVisible();
  await page.getByLabel(/First, enter your key/).fill('1412');
  await page.getByRole('button', { name: 'Use key' }).click();
  // Decode the first word letter by letter, then type the rest.
  await page.getByLabel(/Letter 1: J minus 1/).fill('I');
  await page.getByText('Prefer to type the whole message?').click();
  await page.getByPlaceholder('Decoded message').fill('I am not a person');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expectSolved(page);
  await continueToNext(page, /On to Caminito/);

  // Chapter 6 — Caminito: three truths and a tale.
  await moveTo(context, 'caminito');
  await expect(page.getByText(/Looks like you’re close to Caminito/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'We’re here' }).first().click();
  await openChallenge(page);
  await page.getByRole('radio', { name: /curves because it follows/ }).click();
  await page.getByRole('button', { name: 'This one is the tale' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'That one is true' })).toBeVisible();
  await page.getByRole('radio', { name: /tango/ }).click();
  await page.getByRole('button', { name: 'This one is the tale' }).click();
  await expectSolved(page);
  await continueToNext(page, /On to El Rosedal/);

  // Chapter 7 — El Rosedal: pretend it's closed and skip the whole stop.
  await expect(page.getByRole('heading', { name: 'El Rosedal' })).toBeVisible();
  await page.getByRole('button', { name: 'Problems?' }).click();
  await page.getByRole('button', { name: 'Skip this stop' }).click();
  await page.getByRole('button', { name: 'Skip this stop' }).last().click();

  // Back on the home screen, the next stop is the Floralis Genérica.
  await expect(page.getByRole('heading', { name: 'The Silver Flower' })).toBeVisible();
  await page.getByRole('link', { name: /Directions to Floralis Genérica/ }).click();
  await moveTo(context, 'floralis');
  await expect(page.getByText(/Looks like you’re close to Floralis Genérica/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'We’re here' }).first().click();
  await openChallenge(page);
  await page.getByRole('textbox', { name: 'Your answer' }).fill('steel');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'made of' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('silver');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expectSolved(page);
  await continueToNext(page, /To the finale|On to Córdoba y Gallo/);

  // Finale — back at the corner (its position was recorded at the start, so GPS confirms arrival).
  await moveTo(context, 'start');
  await expect(page.getByText(/You’ve arrived: Córdoba y Gallo/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Begin' }).click();
  await openChallenge(page);
  for (const name of ['A lifelong porteño', 'Juan de Garay', 'Buenos Aires itself', 'The wind', 'The Obelisco']) {
    await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
  }
  await page.getByRole('button', { name: 'Name the voice: The Río de la Plata' }).click();
  await expect(page.getByRole('heading', { name: 'The sealed envelope' })).toBeVisible();
  await page.getByRole('button', { name: 'Break the seal' }).click();
  await expect(page.getByRole('heading', { name: 'A letter from the river' })).toBeVisible();
  await expect(page.getByText('Yes. I’m the river.')).toBeVisible();
  await expect(page.getByText(/That is the hidden city/)).toBeVisible();

  // The journal keeps all nine threads, including the skipped stop's.
  await page.goto('./#/journal/threads');
  await expect(page.locator('blockquote.thread')).toHaveCount(9);
  await page.goto('./#/journal/challenges');
  await expect(page.getByText('Skipped', { exact: true })).toHaveCount(1);
  await expect(page.getByText('1 skipped')).toBeVisible();

  expect(errors, errors.join('\n')).toEqual([]);
});
