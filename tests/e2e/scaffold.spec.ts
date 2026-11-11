import { test, expect } from '@playwright/test';
import sample from '../../packages/schema/fixtures/sample.cdom.json' with { type: 'json' };

test('loads the validated local fixture, reloads, and exposes read-only JSON', async ({ page, request }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Neon Shogun — Rooftop');
  await expect(page.getByRole('status')).toContainText('Local API connected');
  await expect(page.getByRole('heading', { name: 'Kael', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rooftop Confrontation' })).toBeVisible();
  const fontLoaded = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px Manrope'); });
  expect(fontLoaded).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Reload document' }).click();
  await expect(page.getByRole('status')).toContainText('Document validated');
  const json = await request.get('/api/v1/fixtures/neon-shogun');
  expect(json.status()).toBe(200);
  expect(await json.json()).toEqual(sample);
  expect((await request.post('/api/v1/fixtures/neon-shogun', { data: sample })).status()).toBe(405);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('document.png'), fullPage: true });
});

test('shows a service failure and recovers on retry', async ({ page }) => {
  await page.route('**/api/v1/health', route => route.fulfill({ status: 503, json: { error: 'offline' } }));
  await page.goto('/');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('unavailable');
  await expect(page.getByRole('heading', { name: 'Document unavailable' })).toBeVisible();
  await page.unroute('**/api/v1/health');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(sample.project.title);
});

test('does not present an invalid document as connected', async ({ page }) => {
  await page.route('**/api/v1/fixtures/neon-shogun', route => route.fulfill({ json: { ...sample, schemaVersion: '9.0.0' } }));
  await page.goto('/');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('document contract');
  await expect(page.getByText('Local API connected')).toHaveCount(0);
});

test('shows honest empty states for a structurally valid empty project', async ({ page }) => {
  await page.route('**/api/v1/fixtures/neon-shogun', route => route.fulfill({ json: { ...sample, scenes: [], characters: [] } }));
  await page.goto('/');
  await expect(page.getByText('No scenes in this document.')).toBeVisible();
  await expect(page.getByText('No characters in this document.')).toBeVisible();
});

test('supports keyboard navigation and narrow reflow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Document validated');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to document' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Reload document' })).toBeFocused();
  // A 720px viewport is the reflow equivalent of a 1440px display at 200% zoom.
  for (const width of [720, 360]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
});
