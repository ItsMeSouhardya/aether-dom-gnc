import { expect, test, type Page } from '@playwright/test';
const base = '/api/v1/projects/proj_neon_shogun/branches/branch_main';
const openMixer = async (page: Page) => { await page.getByRole('button', { name: 'Audio mixer', exact: true }).click(); await expect(page.getByRole('region', { name: 'Audio mixer', exact: true })).toBeVisible(); };

test('requires an explicit audio gesture and previews tension without writing canon', async ({ page, request }) => {
  const before = await (await request.get(`${base}/document`)).json();
  await page.goto('/'); await openMixer(page);
  await expect(page.getByRole('button', { name: 'Enable audio', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Enable audio', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause preview', exact: true }).click();
  await page.getByRole('button', { name: 'Enable audio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Disable audio', exact: true })).toBeEnabled();
  await page.getByLabel('Tension', { exact: true }).fill('0.95');
  await expect(page.getByLabel('Preview tension', { exact: true })).toContainText('95');
  expect((await (await request.get(`${base}/document`)).json()).document).toEqual(before.document);
  await page.getByRole('button', { name: 'Cancel tension', exact: true }).click();
  await page.getByRole('button', { name: 'Disable audio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Enable audio', exact: true })).toBeVisible();
});

test('saves and reloads editorial tension with exact undo', async ({ page, request }) => {
  const before = await (await request.get(`${base}/document`)).json();
  await page.goto('/'); await openMixer(page);
  await page.getByLabel('Tension', { exact: true }).fill('0.9');
  await page.getByRole('button', { name: 'Save tension', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  const saved = await (await request.get(`${base}/document`)).json();
  expect(saved.document.shots[0].audio.tension).toBe(.9);
  expect(saved.document.layers).toEqual(before.document.layers);
  await page.reload(); await openMixer(page);
  await expect(page.getByLabel('Tension', { exact: true })).toHaveValue('0.9');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  const undone = await (await request.get(`${base}/document`)).json();
  expect(undone.document.shots).toEqual(before.document.shots);
  expect(undone.document.schemaVersion).toBe(before.document.schemaVersion);
});

test('recovers from a missing audio asset and stays usable through repeated seeks', async ({ page }) => {
  await page.route('**/audio/asset_ambient?*', route => route.fulfill({ status: 404, json: { detail: { message: 'Audio file is missing.' } } }));
  await page.goto('/'); await openMixer(page);
  await page.getByRole('button', { name: 'Enable audio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry audio', exact: true })).toBeVisible();
  await page.unroute('**/audio/asset_ambient?*');
  await page.getByRole('button', { name: 'Retry audio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Disable audio', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Play preview', exact: true }).click();
  for (const time of ['7000', '1000', '7000']) {
    await page.getByLabel('Seek time', { exact: true }).fill(time);
    await expect(page.getByRole('button', { name: 'Pause preview', exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Pause preview', exact: true }).click();
  await page.getByLabel('Seek time', { exact: true }).fill('2000');
  await expect(page.getByLabel('Seek time', { exact: true })).toHaveValue('2000');
  const markerFits = await page.locator('.timeline-playhead').first().evaluate(element => {
    const marker = element.getBoundingClientRect(), lane = element.parentElement!.getBoundingClientRect();
    return marker.top >= lane.top && marker.bottom <= lane.bottom;
  });
  expect(markerFits).toBe(true);
  await expect(page.getByRole('button', { name: 'Disable audio', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('renders the checked-in Foley into distinct stereo channels and repeats seek offsets exactly', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async (url) => {
    const data = await (await fetch(url)).arrayBuffer();
    async function render(pan: number, offset: number) {
      const context = new OfflineAudioContext(2, 4096, 22050);
      const buffer = await context.decodeAudioData(data.slice(0));
      const source = context.createBufferSource(), panner = context.createStereoPanner();
      source.buffer = buffer; source.loop = true; panner.pan.value = pan;
      source.connect(panner).connect(context.destination); source.start(0, offset % buffer.duration);
      const output = await context.startRendering();
      return [Array.from(output.getChannelData(0)), Array.from(output.getChannelData(1))];
    }
    const rms = (samples: number[]) => Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
    const left = await render(-1, 2), right = await render(1, 2), repeated = await render(-1, 10);
    return { left: left.map(rms), right: right.map(rms), seekIdentical: left[0].every((value, i) => value === repeated[0][i]) };
  }, `${base}/audio/asset_foley?revision=0`);
  expect(result.left[0]).toBeGreaterThan(.02); expect(result.left[1]).toBeLessThan(.0001);
  expect(result.right[1]).toBeGreaterThan(.02); expect(result.right[0]).toBeLessThan(.0001);
  expect(result.seekIdentical).toBe(true);
});

test('pans the bound prop and draws analyser glow during a cancellable live drag', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Layer navigator' }).getByRole('button', { name: 'Select layer Sign', exact: true }).click();
  await page.getByRole('button', { name: 'Bring forward', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  const before = await (await request.get(`${base}/document`)).json();
  await openMixer(page);
  await page.getByRole('button', { name: 'Enable audio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Disable audio', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Play preview', exact: true }).click();
  await page.getByRole('button', { name: 'Layout mode', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause preview', exact: true })).toBeVisible();
  const prop = page.getByRole('button', { name: 'Select stage layer Sign', exact: true });
  await prop.scrollIntoViewIfNeeded(); const box = (await prop.boundingBox())!;
  const pan = page.getByLabel('track_sign_foley pan', { exact: true });
  const initial = Number(await pan.textContent());
  await page.mouse.move(box.x + box.width * .9, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width * .9 - 100, box.y + box.height / 2, { steps: 5 });
  await expect.poll(async () => Number(await pan.textContent())).toBeLessThan(initial - .1);
  await expect.poll(async () => Number(await page.locator('.stage-audio-glow').evaluate(el => getComputedStyle(el).opacity))).toBeGreaterThan(0);
  await page.keyboard.press('Escape'); await page.mouse.up();
  await expect.poll(async () => Number(await pan.textContent())).toBe(initial);
  expect((await (await request.get(`${base}/document`)).json()).document).toEqual(before.document);
  await page.getByRole('button', { name: 'Pause preview', exact: true }).click();
  await expect.poll(async () => Number(await page.locator('.stage-audio-glow').evaluate(el => getComputedStyle(el).opacity))).toBe(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await (await request.get(`${base}/document`)).json()).document.project.revision).toBe(before.document.project.revision + 1);
});

test('rejects a stale tension draft and preserves the first editor save', async ({ page, context, request }) => {
  const before = await (await request.get(`${base}/document`)).json();
  await page.goto('/'); await openMixer(page);
  const other = await context.newPage(); await other.goto('/'); await openMixer(other);
  await page.getByLabel('Tension', { exact: true }).fill('0.25');
  await other.getByLabel('Tension', { exact: true }).fill('0.85');
  await page.getByRole('button', { name: 'Save tension', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  await other.getByRole('button', { name: 'Save tension', exact: true }).click();
  await expect(other.getByRole('alert', { name: 'Save status' })).toContainText('changed');
  expect((await (await request.get(`${base}/document`)).json()).document.shots[0].audio.tension).toBe(.25);
  await other.close();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await (await request.get(`${base}/document`)).json()).document.shots).toEqual(before.document.shots);
});

test('respects reduced motion until glow is explicitly enabled', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/'); await openMixer(page);
  await expect(page.getByLabel('Reactive glow', { exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: 'Enable audio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Disable audio', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Play preview', exact: true }).click();
  await expect(page.locator('.stage-audio-glow')).toHaveCSS('opacity', '0');
  await page.getByLabel('Reactive glow', { exact: true }).check();
  await expect.poll(async () => Number(await page.locator('.stage-audio-glow').evaluate(el => getComputedStyle(el).opacity))).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause preview', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('audio-mixer.png'), fullPage: true, scale: 'css' });
});
