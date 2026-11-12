import { expect, test } from '@playwright/test';
const base = '/api/v1/projects/proj_neon_shogun/branches/branch_main';
test('edits portrait overrides and fits both subjects without changing landscape canon', async ({ page, request }, testInfo) => {
  const before = await (await request.get(`${base}/document`)).json();
  await page.goto('/');
  await page.getByRole('button', { name: 'Preview 9:16', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Portrait composition' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save portrait layout', exact: true })).toBeVisible();
  expect((await (await request.get(`${base}/document`)).json()).document).toEqual(before.document);
  await page.getByRole('button', { name: 'Fit subjects', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Portrait composition' })).toContainText('Unsaved draft');
  expect((await (await request.get(`${base}/document`)).json()).document).toEqual(before.document);
  await page.getByRole('button', { name: 'Save portrait layout', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  const after = await (await request.get(`${base}/document`)).json();
  expect(after.document.layers).toEqual(before.document.layers);
  expect(after.document.shots[0].camera).toEqual(before.document.shots[0].camera);
  expect(after.document.shots[0].layoutOverrides['9:16']).not.toEqual(before.document.shots[0].layoutOverrides['9:16']);
  await expect(page.getByRole('region', { name: 'Portrait composition' })).toContainText('safe');
  await page.screenshot({ path: testInfo.outputPath('portrait-studio.png'), fullPage: true });
  await page.reload(); await page.getByRole('button', { name: 'Preview 9:16', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await (await request.get(`${base}/document`)).json()).document.shots).toEqual(before.document.shots);
});

test('exports the saved manifest and reopens embedded media with the API blocked', async ({ page, request }, testInfo) => {
  const before = await (await request.get(`${base}/document`)).json();
  await page.goto('/');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const download = await downloadEvent;
  const path = testInfo.outputPath('export.cdom.json'); await download.saveAs(path);
  const fs = await import('node:fs/promises'), manifest = JSON.parse(await fs.readFile(path, 'utf8'));
  expect(manifest.document).toEqual(before.document); expect(manifest.assets).toHaveLength(7);
  expect(manifest.assets.filter((asset: { kind: string }) => asset.kind === 'audio').every((asset: { dataBase64: string }) => asset.dataBase64.length > 0)).toBe(true);
  await page.getByRole('link', { name: 'Player', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Saved composition player' })).toBeVisible();
  await page.route('**/api/**', route => route.abort());
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.getByLabel('Open local player JSON').setInputFiles(path);
  await expect(page.getByText(/Local file · export.cdom.json/)).toBeVisible();
  await page.getByLabel('Player aspect ratio').selectOption('9:16');
  const frame = page.getByRole('group', { name: 'Player stage' });
  const box = await frame.boundingBox(); expect(box!.width / box!.height).toBeCloseTo(9 / 16, 1);
  await page.getByRole('button', { name: 'Enable audio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Disable audio', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect.poll(() => page.getByLabel('Seek player').inputValue()).not.toBe('0');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('portrait-player.png'), fullPage: true });
  await page.getByLabel('Player aspect ratio').selectOption('16:9');
  await expect(page.getByRole('button', { name: 'Enable audio', exact: true })).toBeVisible();
  await frame.focus(); await page.keyboard.press('Space'); await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]); expect((await (await request.get(`${base}/document`)).json()).document).toEqual(before.document);
});

test('nudges only the portrait transform and keeps a clean portrait inspector current', async ({ page, request }) => {
  const before = await (await request.get(`${base}/document`)).json();
  await page.goto('/'); await page.getByRole('button', { name: 'Preview 9:16', exact: true }).click();
  const kael = page.getByRole('button', { name: 'Select stage layer Kael', exact: true });
  await kael.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await (await request.get(`${base}/document`)).json()).document.project.revision).toBe(before.document.project.revision + 1);
  await expect(page.getByRole('button', { name: 'Fit subjects', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Edit portrait X', { exact: true })).toHaveValue(String(before.document.shots[0].layoutOverrides['9:16'].layerTransforms.layer_kael.x + .05));
  expect((await (await request.get(`${base}/document`)).json()).document.layers).toEqual(before.document.layers);
  await page.getByLabel('Edit portrait X', { exact: true }).fill('-0.4');
  await page.getByRole('button', { name: 'Preview 9:16', exact: true }).click();
  await expect(page.locator('.stage-caption')).toContainText('Unsaved portrait draft');
  await expect(page.getByLabel('Edit portrait X', { exact: true })).toHaveValue('-0.4');
  await page.getByRole('button', { name: 'Cancel layout', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save portrait layout', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await (await request.get(`${base}/document`)).json()).document.shots).toEqual(before.document.shots);
});

test('rejects stale portrait drafts and keeps export and player failures actionable', async ({ page, request }) => {
  const before = await (await request.get(`${base}/document`)).json();
  await page.goto('/'); await page.getByRole('button', { name: 'Preview 9:16', exact: true }).click();
  await page.getByRole('navigation', { name: 'Layer navigator' }).getByRole('button', { name: 'Select layer Kael', exact: true }).click();
  await page.getByLabel('Edit portrait X', { exact: true }).fill('-0.4');
  const external = await request.post(`${base}/commands`, { data: { commandId: crypto.randomUUID(), projectId: before.document.project.id, branchId: before.document.project.activeBranchId, expectedRevision: before.document.project.revision, actor: { kind: 'human', id: 'other_editor' }, op: 'setLayerTransform', targetId: 'layer_vance', args: { x: .4 }, reason: 'Test conflicting edit' } });
  expect(external.ok()).toBe(true);
  await page.getByRole('button', { name: 'Save portrait layout', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reload latest', exact: true })).toBeVisible();
  expect((await (await request.get(`${base}/document`)).json()).document.shots).toEqual(before.document.shots);
  await page.getByRole('button', { name: 'Reload latest', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await (await request.get(`${base}/document`)).json()).document.layers).toEqual(before.document.layers);
  await page.route('**/player-manifest*', route => route.fulfill({ status: 422, json: { detail: { message: 'A referenced media file is missing. Restore it and retry.' } } }));
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'Export error' })).toContainText('Restore it and retry');
  await expect(page.getByRole('region', { name: 'Layered stage' })).toBeVisible();
  await page.goto('/player'); await expect(page.locator('#player-content').getByRole('alert')).toContainText('Restore it and retry');
  await page.unroute('**/player-manifest*'); await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Saved composition player' })).toBeVisible();
  await page.getByLabel('Open local player JSON').setInputFiles({ name: 'bad.cdom.json', mimeType: 'application/json', buffer: Buffer.from('{"manifestVersion":"1.0.0","document":{}}') });
  await expect(page.locator('#player-content').getByRole('alert')).toContainText('invalid');
  await expect(page.getByRole('button', { name: 'Enable audio', exact: true })).toHaveCount(0);
});

test('keeps portrait editing spacious and the header contained at narrow widths', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Preview 9:16', exact: true })).toBeVisible();
  for (const width of [1024, 720, 360]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter(element => {
      const rect = element.getBoundingClientRect(); return rect.width > 0 && rect.right > innerWidth + 1 && getComputedStyle(element).position !== 'absolute';
    }).slice(0, 8).map(element => ({ tag: element.tagName, class: element.className, parent: element.parentElement?.className, text: element.textContent?.slice(0, 80), right: element.getBoundingClientRect().right })));
    expect(overflow).toEqual([]);
  }
  await page.getByRole('button', { name: 'Preview 9:16', exact: true }).click();
  const frame = await page.locator('.stage-canvas').boundingBox();
  expect(frame!.width).toBeGreaterThan(200); expect(frame!.width / frame!.height).toBeCloseTo(9 / 16, 1);
  expect(await page.locator('.portrait-panel > .inspector-content').evaluate(element => Number.parseFloat(getComputedStyle(element).paddingLeft))).toBeGreaterThanOrEqual(16);
});
