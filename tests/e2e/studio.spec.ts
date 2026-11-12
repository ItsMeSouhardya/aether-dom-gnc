import { expect, test } from '@playwright/test';
import sample from '../../packages/schema/fixtures/sample.cdom.json' with { type: 'json' };
import { emptyAnalysis } from '../../apps/web/tests/fixtures/analysis';
import type { CdomDocument } from '@aether-dom/schema';

const documentRoute = '**/api/v1/projects/proj_neon_shogun/branches/branch_main/document';
const snapshot = (document: unknown) => ({ document, history: { canUndo: false, canRedo: false, entries: [] }, analysis: emptyAnalysis(document as CdomDocument) });

test('selects layers through the navigator and stage and inspects exact canon values', async ({ page, request }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(sample.project.title);
  const navigator = page.getByRole('navigation', { name: 'Layer navigator' });
  const inspector = page.getByRole('region', { name: 'Inspector' });
  await navigator.getByRole('button', { name: 'Select layer Kael', exact: true }).click();
  await expect(inspector.getByLabel('X position')).toHaveText('-0.65');
  await expect(inspector.getByLabel('Y position')).toHaveText('-0.1');
  await expect(inspector.getByLabel('Z position')).toHaveText('0');
  await expect(inspector.getByLabel('Scale')).toHaveText('1');
  await expect(inspector.getByLabel('Rotation')).toHaveText('0°');
  await expect(navigator.getByRole('button', { name: 'Select layer Kael', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const stage = page.getByRole('region', { name: 'Layered stage' });
  await stage.getByRole('button', { name: 'Select stage layer Vance', exact: true }).click();
  await expect(inspector.getByLabel('X position')).toHaveText('0.65');
  await expect(navigator.getByRole('button', { name: 'Select layer Vance', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: 'Timeline' })).toContainText('16s');
  await page.getByRole('button', { name: 'Diagnostics' }).click();
  await expect(page.getByRole('article', { name: 'CANON_PHYSICAL_CONFLICT layer_kael', exact: true })).toBeVisible();
  expect(await (await request.get('/api/v1/fixtures/neon-shogun')).json()).toEqual(sample);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('studio.png'), fullPage: true, scale: 'css' });
});

test('selects an empty scene and returns to a shot with no stale inspector', async ({ page }) => {
  await page.goto('/');
  const navigator = page.getByRole('navigation', { name: 'Layer navigator' });
  await navigator.getByRole('button', { name: 'Select layer Kael', exact: true }).click();
  await page.getByRole('button', { name: 'Select scene The Escape', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Layered stage' })).toContainText('No shots in this scene');
  await expect(page.getByRole('region', { name: 'Inspector' })).toContainText('Select a layer');
  await expect(navigator.getByRole('button')).toHaveCount(0);
  await page.getByRole('button', { name: 'Select shot Rooftop Confrontation (shot_rooftop)', exact: true }).click();
  await navigator.getByRole('button', { name: 'Select layer Sign', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Inspector' }).getByLabel('Scale')).toHaveText('0.55');
  await page.getByRole('region', { name: 'Layered stage' }).getByRole('button', { name: 'Select stage layer Sign', exact: true }).press('Escape');
  await expect(page.getByRole('region', { name: 'Inspector' })).toContainText('Select a layer');
});

test('retains failure/retry and empty project states in the studio', async ({ page }) => {
  await page.route(documentRoute, route => route.fulfill({ status: 503, json: { error: 'offline' } }));
  await page.goto('/');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('unavailable');
  await page.unroute(documentRoute);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(sample.project.title);
  await page.route(documentRoute, route => route.fulfill({ json: snapshot({ ...sample, scenes: [], shots: [], characters: [] }) }));
  await page.getByRole('button', { name: 'Reload document' }).click();
  await expect(page.getByText('No scenes in this document.')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Layered stage' })).toContainText('No shot selected');
});

test('allows keyboard selection, resets on reload and supports narrow reflow', async ({ page }) => {
  await page.goto('/');
  const kael = page.getByRole('navigation', { name: 'Layer navigator' }).getByRole('button', { name: 'Select layer Kael', exact: true });
  await kael.press('Enter');
  await expect(page.getByRole('region', { name: 'Inspector' }).getByLabel('X position')).toHaveText('-0.65');
  await page.getByRole('button', { name: 'Reload document' }).click();
  await expect(page.getByRole('region', { name: 'Inspector' })).toContainText('Select a layer');
  for (const width of [1024, 720, 360]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(kael).toBeVisible();
    await kael.click();
    await expect(page.getByRole('region', { name: 'Inspector' }).getByLabel('X position')).toHaveText('-0.65');
  }
});

test('gives the stage useful space on a fullscreen desktop with scaled browser UI', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1536, height: 730 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Import SVG', exact: true })).toBeVisible();
  const frame = page.locator('.stage-canvas');
  const geometry = await page.locator('.stage-workspace').evaluate(element => {
    const container = element.getBoundingClientRect(), canvas = element.querySelector('.stage-canvas')!.getBoundingClientRect();
    return { available: container.width, width: canvas.width, height: canvas.height, fits: canvas.top >= container.top && canvas.bottom <= container.bottom };
  });
  expect(geometry.width).toBeGreaterThan(geometry.available * .7);
  expect(geometry.fits).toBe(true);
  expect(geometry.width / geometry.height).toBeCloseTo(16 / 9, 1);
  await page.screenshot({ path: testInfo.outputPath('fullscreen-stage.png'), fullPage: true });
  await page.getByRole('button', { name: 'Show timeline tracks', exact: true }).click();
  await expect(page.locator('.timeline-layout')).toBeVisible();
  expect((await frame.boundingBox())!.width).toBeLessThan(geometry.width);
  await page.getByRole('button', { name: 'Hide timeline tracks', exact: true }).click();
  await expect(page.locator('.timeline-layout')).toBeHidden();
  await page.getByRole('button', { name: 'Animation mode', exact: true }).click();
  await expect(page.locator('.timeline-layout')).toBeVisible();
  await page.getByRole('button', { name: 'Layout mode', exact: true }).click();
  await page.setViewportSize({ width: 1920, height: 930 });
  await expect.poll(async () => (await frame.boundingBox())!.width).toBeGreaterThan(900);
  await expect(page.getByRole('button', { name: 'Diagnostics', exact: true })).toBeVisible();
});

test('fits the stage frame when diagnostics reduce the available height', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Layer navigator' }).getByRole('button', { name: 'Select layer Kael', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Diagnostics' }).click();
  const geometry = await page.locator('.stage-workspace').evaluate(element => {
    const container = element.getBoundingClientRect();
    const frame = element.querySelector('.stage-canvas')!.getBoundingClientRect();
    return { top: frame.top - container.top, bottom: container.bottom - frame.bottom, width: frame.width, ratio: frame.width / frame.height };
  });
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeGreaterThanOrEqual(0);
  expect(geometry.width).toBeGreaterThan(240);
  expect(geometry.ratio).toBeCloseTo(16 / 9, 1);
});

test('distinguishes multiple shots in the same scene by accessible name', async ({ page }) => {
  const document = structuredClone(sample);
  document.shots.push({ ...structuredClone(document.shots[0]), id: 'shot_second', layerIds: [] });
  document.scenes[1].shotIds.push('shot_second');
  await page.route(documentRoute, route => route.fulfill({ json: snapshot(document) }));
  await page.goto('/');
  const first = page.getByRole('button', { name: 'Select shot Rooftop Confrontation (shot_rooftop)', exact: true });
  const second = page.getByRole('button', { name: 'Select shot Rooftop Confrontation (shot_second)', exact: true });
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  await second.click();
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: 'Layered stage' })).toContainText('No layers in this shot');
  await first.click();
  await expect(page.getByRole('navigation', { name: 'Layer navigator' }).getByRole('button', { name: 'Select layer Kael', exact: true })).toBeVisible();
});

test('wraps long document titles and branch names on narrow screens', async ({ page }) => {
  const document = structuredClone(sample);
  document.project.title = 'X'.repeat(300);
  document.branches[0].name = 'Y'.repeat(180);
  document.scenes[1].title = 'Z'.repeat(200);
  await page.route(documentRoute, route => route.fulfill({ json: snapshot(document) }));
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(document.project.title);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
