import { expect, test, type Page } from '@playwright/test';

const base = '/api/v1/projects/proj_neon_shogun/branches/branch_main';
const selectKael = (page: Page) => page.getByRole('navigation', { name: 'Layer navigator' }).getByRole('button', { name: 'Select layer Kael', exact: true }).click();
const svg = '<svg xmlns="http://www.w3.org/2000/svg" id="import_root" viewBox="0 0 100 100"><rect id="prop-shape" x="10" y="10" width="80" height="80" fill="#547679"/></svg>';
const read = async (request: import('@playwright/test').APIRequestContext) => (await request.get(`${base}/document`)).json();

test('shows editable stage controls and a real local SVG scene', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Import SVG', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Layout mode', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Animation mode', exact: true })).toBeVisible();
  await selectKael(page);
  await expect(page.getByRole('button', { name: 'Select stage layer Kael', exact: true })).toBeVisible();
  await expect(page.getByText('Loading SVG assets…', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Layered stage' })).toContainText('2.5D');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('stage.png'), fullPage: true, scale: 'css' });
});

test('moves only one layer with a single drag command and persists exact values', async ({ page, request }) => {
  const before = await read(request);
  await page.goto('/'); await selectKael(page);
  const target = page.getByRole('button', { name: 'Select stage layer Kael', exact: true });
  await target.scrollIntoViewIfNeeded();
  const bounds = await target.boundingBox(); expect(bounds).toBeTruthy();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await page.mouse.down(); await page.mouse.move(bounds!.x + bounds!.width / 2 + 28, bounds!.y + bounds!.height / 2 - 16, { steps: 4 }); await page.mouse.up();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  const after = await read(request);
  expect(after.document.project.revision).toBe(before.document.project.revision + 1);
  const moved = after.document.layers.find((layer: { id: string }) => layer.id === 'layer_kael');
  expect(moved.transform.x).toBeGreaterThan(before.document.layers[1].transform.x);
  expect(moved.transform.y).toBeGreaterThan(before.document.layers[1].transform.y);
  expect(after.document.layers.filter((layer: { id: string }) => layer.id !== 'layer_kael')).toEqual(before.document.layers.filter((layer: { id: string }) => layer.id !== 'layer_kael'));
  await page.reload(); await selectKael(page);
  await expect(page.getByLabel('X position', { exact: true })).toHaveText(String(moved.transform.x));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByLabel('X position', { exact: true })).toHaveText(String(before.document.layers[1].transform.x));
});

test('cancels a drag without a canonical write and reorders only its target depth', async ({ page, request }) => {
  const before = await read(request);
  await page.goto('/'); await selectKael(page);
  await page.getByRole('button', { name: 'Select stage layer Kael', exact: true }).scrollIntoViewIfNeeded();
  const bounds = await page.getByRole('button', { name: 'Select stage layer Kael', exact: true }).boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2); await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width / 2 + 25, bounds!.y + bounds!.height / 2); await page.keyboard.press('Escape'); await page.mouse.up();
  expect((await read(request)).document).toEqual(before.document);
  await page.getByRole('button', { name: 'Bring forward', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  const after = await read(request);
  expect(after.document.layers[1].transform.z).toBeGreaterThan(before.document.layers[1].transform.z);
  expect(after.document.layers[2]).toEqual(before.document.layers[2]);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByLabel('Z position', { exact: true })).toHaveText(String(before.document.layers[1].transform.z));
});

test('preserves imported asset and SVG element IDs through editing and reload', async ({ page, request }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Import SVG', exact: true }).click();
  await page.getByLabel('Import SVG file', { exact: true }).setInputFiles({ name: 'prop.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) });
  await page.getByRole('button', { name: 'Import SVG layer', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  const imported = await read(request);
  const layer = imported.document.layers.find((item: { name?: string }) => item.name === 'prop');
  expect(layer).toBeTruthy();
  const originalAsset = imported.document.assets.find((item: { id: string }) => item.id === layer.assetId);
  await page.getByRole('navigation', { name: 'Layer navigator' }).getByRole('button', { name: 'Select layer prop', exact: true }).click();
  await page.getByRole('button', { name: 'Edit SVG', exact: true }).click();
  await page.getByLabel('SVG element', { exact: true }).selectOption('prop-shape');
  await page.getByLabel('SVG fill', { exact: true }).fill('#e9aa66');
  await page.getByRole('button', { name: 'Save SVG changes', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  const edited = await read(request);
  const asset = edited.document.assets.find((item: { id: string }) => item.id === layer.assetId);
  expect(asset.id).toBe(originalAsset.id); expect(asset.sourceUri).toBe(originalAsset.sourceUri); expect(asset.uri).not.toBe(originalAsset.uri);
  await page.reload();
  await page.getByRole('navigation', { name: 'Layer navigator' }).getByRole('button', { name: 'Select layer prop', exact: true }).click();
  await page.getByRole('button', { name: 'Edit SVG', exact: true }).click();
  await page.getByLabel('SVG element', { exact: true }).selectOption('prop-shape');
  await expect(page.getByLabel('SVG fill', { exact: true })).toHaveValue('#e9aa66');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Layer navigator' }).getByRole('button', { name: 'Select layer prop', exact: true })).toHaveCount(0);
});

test('saves camera settings and an interpolated keyframe while preserving the base transform', async ({ page, request }) => {
  const before = await read(request);
  await page.goto('/'); await selectKael(page);
  await page.getByRole('button', { name: 'Camera', exact: true }).click();
  await page.getByLabel('Camera X', { exact: true }).fill('0.25');
  await page.getByRole('button', { name: 'Save camera', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  expect((await read(request)).document.shots[0].camera.position.x).toBe(0.25);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  await page.getByRole('button', { name: 'Animation mode', exact: true }).click();
  await page.getByLabel('Seek time', { exact: true }).fill('4000');
  await page.getByRole('button', { name: 'Add keyframe', exact: true }).click();
  await page.getByLabel('Keyframe X', { exact: true }).fill(String(before.document.layers[1].transform.x + 1));
  await page.getByRole('button', { name: 'Save keyframe', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  const saved = await read(request);
  expect(saved.document.layers[1].transform).toEqual(before.document.layers[1].transform);
  expect(saved.document.layers[1].keyframes[0].timeMs).toBe(4000);
  await page.reload(); await selectKael(page); await page.getByRole('button', { name: 'Animation mode', exact: true }).click();
  await page.getByLabel('Seek time', { exact: true }).fill('2000');
  await expect(page.getByLabel('Preview X', { exact: true })).toHaveText(String(before.document.layers[1].transform.x + 0.5));
  await page.getByRole('button', { name: 'Play preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause preview', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause preview', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  expect((await read(request)).document.layers[1]).toEqual(before.document.layers[1]);
});

test('retains native SVG editing when WebGL2 is unavailable', async ({ page }) => {
  await page.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) { if (type === 'webgl2') return null; return original.apply(this, [type, ...args] as Parameters<typeof original>); } as typeof original; });
  await page.goto('/'); await selectKael(page);
  await expect(page.getByRole('region', { name: 'Layered stage' })).toContainText('SVG fallback');
  await expect(page.getByRole('button', { name: 'Select stage layer Kael', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit transform', exact: true }).click();
  await expect(page.getByLabel('Edit X position', { exact: true })).toBeVisible();
});

test('keeps playback usable after mounting and effect replay', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause preview', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause preview', exact: true }).click();
  await page.getByLabel('Seek time', { exact: true }).fill('4000');
  await expect(page.getByLabel('Seek time', { exact: true })).toHaveValue('4000');
});
