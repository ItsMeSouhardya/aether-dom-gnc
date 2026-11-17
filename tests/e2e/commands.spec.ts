import { expect, test, type Page } from '@playwright/test';

const base = '/api/v1/projects/proj_neon_shogun/branches/branch_main';
async function selectKael(page: Page) {
  await page.getByRole('navigation', { name: 'Layer navigator' }).getByRole('button', { name: 'Select layer Kael', exact: true }).click();
}
async function editX(page: Page, value: number) {
  await page.getByRole('button', { name: 'Edit transform', exact: true }).click();
  await page.getByLabel('Edit X position', { exact: true }).fill(String(value));
}

test('saves, reloads, undoes and redoes an exact authored transform', async ({ page, request }, testInfo) => {
  const before = await (await request.get(`${base}/document`)).json();
  const original = before.document.layers.find((layer: { id: string }) => layer.id === 'layer_kael').transform.x as number;
  await page.goto('/studio'); await selectKael(page);
  await expect(page.getByRole('button', { name: 'Edit transform', exact: true })).toBeVisible();
  await editX(page, original + 0.4);
  await page.getByRole('button', { name: 'Save transform', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Inspector' }).getByLabel('X position', { exact: true })).toHaveText(String(original + 0.4));
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  await page.reload(); await selectKael(page);
  await expect(page.getByRole('region', { name: 'Inspector' }).getByLabel('X position', { exact: true })).toHaveText(String(original + 0.4));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Inspector' }).getByLabel('X position', { exact: true })).toHaveText(String(original));
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Inspector' }).getByLabel('X position', { exact: true })).toHaveText(String(original + 0.4));
  await page.getByRole('button', { name: 'Change history', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Change history' })).toContainText('Move Kael');
  await page.screenshot({ path: testInfo.outputPath('commands.png'), fullPage: true, scale: 'css' });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Inspector' }).getByLabel('X position', { exact: true })).toHaveText(String(original));
  expect((await (await request.get(`${base}/document`)).json()).document.project.revision).toBe(before.document.project.revision + 4);
});

test('rejects a stale second editor without overwriting the first save', async ({ page, context, request }) => {
  const before = await (await request.get(`${base}/document`)).json();
  const original = before.document.layers[1].transform.x as number;
  const other = await context.newPage();
  await page.goto('/studio'); await other.goto('/studio'); await selectKael(page); await selectKael(other);
  await editX(page, original + 0.1); await editX(other, original + 0.2);
  await page.getByRole('button', { name: 'Save transform', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Inspector' }).getByLabel('X position', { exact: true })).toHaveText(String(original + 0.1));
  await other.getByRole('button', { name: 'Save transform', exact: true }).click();
  await expect(other.getByRole('alert', { name: 'Save status' })).toContainText('Reload latest');
  expect((await (await request.get(`${base}/document`)).json()).document.layers[1].transform.x).toBe(original + 0.1);
  await other.getByRole('button', { name: 'Reload latest', exact: true }).click(); await selectKael(other);
  await expect(other.getByRole('region', { name: 'Inspector' }).getByLabel('X position', { exact: true })).toHaveText(String(original + 0.1));
  await other.close();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Inspector' }).getByLabel('X position', { exact: true })).toHaveText(String(original));
});

test('rejects invalid drafts before sending a command', async ({ page }, testInfo) => {
  let writes = 0;
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/commands')) writes++; });
  await page.goto('/studio'); await selectKael(page);
  await page.getByRole('button', { name: 'Edit transform', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('transform-draft.png'), fullPage: true, scale: 'css' });
  await page.getByLabel('Edit scale', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Save transform', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'Transform validation' })).toContainText('greater than zero');
  expect(writes).toBe(0);
  await page.getByRole('button', { name: 'Cancel transform edit', exact: true }).click();
});

test('keeps an open draft bound to its original revision after undo', async ({ page, request }) => {
  const before = await (await request.get(`${base}/document`)).json();
  const original = before.document.layers[1].transform.x as number;
  await page.goto('/studio'); await selectKael(page); await editX(page, original + 0.2);
  await page.getByRole('button', { name: 'Save transform', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Inspector' }).getByLabel('X position', { exact: true })).toHaveText(String(original + 0.2));
  await editX(page, original + 0.4);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Inspector' }).getByLabel('X position', { exact: true })).toHaveText(String(original));
  await page.getByRole('button', { name: 'Save transform', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'Save status' })).toContainText('Reload latest');
  expect((await (await request.get(`${base}/document`)).json()).document.project.revision).toBe(before.document.project.revision + 2);
  await page.getByRole('button', { name: 'Reload latest', exact: true }).click();
  await selectKael(page);
  await expect(page.getByRole('region', { name: 'Inspector' }).getByLabel('X position', { exact: true })).toHaveText(String(original));
});

test('recovers a committed save with a lost response by reloading', async ({ page, request }) => {
  const before = await (await request.get(`${base}/document`)).json();
  const original = before.document.layers[1].transform.x as number;
  await page.goto('/studio'); await selectKael(page); await editX(page, original + 0.3);
  await page.route('**/commands', async route => { await route.fetch(); await route.abort('failed'); });
  await page.getByRole('button', { name: 'Save transform', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'Save status' })).toContainText('unknown');
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.unroute('**/commands');
  await page.getByRole('button', { name: 'Reload latest', exact: true }).click(); await selectKael(page);
  await expect(page.getByRole('region', { name: 'Inspector' }).getByLabel('X position', { exact: true })).toHaveText(String(original + 0.3));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Inspector' }).getByLabel('X position', { exact: true })).toHaveText(String(original));
});
