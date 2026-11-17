import { expect, test } from '@playwright/test';

test('scrubs playback by dragging the ruler and supports keyboard seeking without writes', async ({ page, request }) => {
  const base = '/api/v1/projects/proj_neon_shogun/branches/branch_main/document';
  const before = await (await request.get(base)).json();
  await page.goto('/studio');
  await page.getByRole('button', { name: 'Animation mode', exact: true }).click();
  const scrubber = page.getByRole('slider', { name: 'Scrub playback', exact: true });
  await expect(scrubber).toBeVisible();
  await scrubber.scrollIntoViewIfNeeded();
  const bounds = (await scrubber.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * .2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .75, bounds.y + bounds.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => Number(await page.getByLabel('Seek time', { exact: true }).inputValue())).toBeGreaterThan(11000);
  await scrubber.focus();
  await page.keyboard.press('Home');
  await expect(page.getByLabel('Seek time', { exact: true })).toHaveValue('0');
  await page.keyboard.press('End');
  await expect(page.getByLabel('Seek time', { exact: true })).toHaveValue('16000');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByLabel('Seek time', { exact: true })).toHaveValue('15999');
  expect((await (await request.get(base)).json()).document).toEqual(before.document);
});

test('drags a track playhead while playing, captures outside the track and clamps at the shot ends', async ({ page, request }) => {
  const base = '/api/v1/projects/proj_neon_shogun/branches/branch_main/document';
  const before = await (await request.get(base)).json();
  await page.goto('/studio');
  await page.getByRole('button', { name: 'Play preview', exact: true }).click();
  const lane = page.locator('.timeline-track-lane').first();
  await lane.scrollIntoViewIfNeeded();
  const bounds = (await lane.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * .25, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height / 2, { steps: 5 });
  await expect.poll(async () => Math.abs(Number(await page.getByLabel('Seek time', { exact: true }).inputValue()) - 8000)).toBeLessThan(80);
  await expect(page.getByRole('button', { name: 'Play preview', exact: true })).toBeVisible();
  await page.mouse.move(bounds.x - 50, bounds.y + bounds.height / 2);
  await expect(page.getByLabel('Seek time', { exact: true })).toHaveValue('0');
  await page.mouse.move(bounds.x + bounds.width + 50, bounds.y + bounds.height / 2);
  await page.mouse.up();
  await expect(page.getByLabel('Seek time', { exact: true })).toHaveValue('16000');
  await page.getByRole('button', { name: 'Play preview', exact: true }).click();
  await expect.poll(async () => Number(await page.getByLabel('Seek time', { exact: true }).inputValue())).toBeGreaterThan(0);
  expect((await (await request.get(base)).json()).document).toEqual(before.document);
});

test('touch scrubbing and cancelling a track drag keep the preview usable', async ({ page }, info) => {
  await page.goto('/studio');
  await page.getByRole('button', { name: 'Animation mode', exact: true }).click();
  const lane = page.locator('.timeline-track-lane').first();
  await lane.scrollIntoViewIfNeeded();
  const bounds = (await lane.boundingBox())!;
  if (info.project.name === 'mobile') {
    await page.touchscreen.tap(bounds.x + bounds.width * .5, bounds.y + bounds.height / 2);
    await expect.poll(async () => Math.abs(Number(await page.getByLabel('Seek time', { exact: true }).inputValue()) - 8000)).toBeLessThan(80);
    const original = await page.getByLabel('Seek time', { exact: true }).inputValue();
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + bounds.width * .25, y: bounds.y + bounds.height / 2 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: bounds.x + bounds.width * .75, y: bounds.y + bounds.height / 2 }] });
    await expect.poll(async () => Math.abs(Number(await page.getByLabel('Seek time', { exact: true }).inputValue()) - 12000)).toBeLessThan(80);
    await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(page.getByLabel('Seek time', { exact: true })).toHaveValue(original);
    await client.detach();
  }
  const original = await page.getByLabel('Seek time', { exact: true }).inputValue();
  await page.mouse.move(bounds.x + bounds.width * .25, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .75, bounds.y + bounds.height / 2);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.getByLabel('Seek time', { exact: true })).toHaveValue(original);
});
