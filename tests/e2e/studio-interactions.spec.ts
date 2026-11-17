import { expect, test } from '@playwright/test';

test('editor has no workspace banner and its brand returns to the homepage', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.getByText('Disposable presentation workspace:', { exact: false })).toHaveCount(0);
  await page.getByRole('link', { name: 'AETHER-DOM home' }).click();
  await expect(page).toHaveURL(/\/welcome(?:\?|$)/);
  await expect(page.locator('.hero-actions')).toBeVisible();
});

test('inspector drafts survive every toolbar panel switch without blocking navigation', async ({ page }) => {
  await page.goto('/studio');
  await page.getByRole('button', { name: 'Add hotspot', exact: true }).click();
  await page.getByLabel('Label', { exact: true }).fill('Keep this unsaved lore');
  let commands = 0;
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/commands')) commands++; });
  for (const [button, panel, close] of [
    ['Jobs', 'Jobs inspector', 'Close jobs'],
    ['Branches', 'Branch inspector', 'Close branches'],
    ['AI proposals', 'Proposal inspector', 'Close proposals'],
    ['Export JSON', 'Export JSON inspector', 'Close export'],
    ['Audio mixer', 'Audio inspector', 'Close audio mixer'],
  ]) {
    await page.getByRole('button', { name: button, exact: true }).click();
    const inspector = page.getByRole('complementary', { name: panel, exact: true });
    await expect(inspector).toBeVisible({ timeout: 2000 });
    await inspector.getByRole('button', { name: close, exact: true }).click();
    await expect(page.getByLabel('Label', { exact: true })).toHaveValue('Keep this unsaved lore');
  }
  await page.getByRole('button', { name: 'Cancel hotspot draft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reload document', exact: true })).toBeEnabled();
  expect(commands).toBe(0);
});

test('toolbar remains available while a save is pending and a hotspot draft can recover', async ({ page }) => {
  await page.goto('/studio');
  await page.getByRole('button', { name: 'Add hotspot', exact: true }).click();
  await page.getByLabel('Label', { exact: true }).fill('Pending lore');
  await page.getByRole('button', { name: 'Review hotspot change', exact: true }).click();
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/commands', async route => { await pending; await route.fulfill({ status: 422, json: { detail: { message: 'Try this edit again.' } } }); });
  await page.getByRole('button', { name: 'Save hotspot change', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saving');
  await page.getByRole('button', { name: 'Jobs', exact: true }).click({ timeout: 2000 });
  await expect(page.getByRole('complementary', { name: 'Jobs inspector' })).toBeVisible();
  release();
  await expect(page.getByRole('alert', { name: 'Save status' })).toContainText('Try this edit again.');
  await page.getByRole('button', { name: 'Close jobs', exact: true }).click();
  await expect(page.getByLabel('Label', { exact: true })).toHaveValue('Pending lore');
  await page.getByRole('button', { name: 'Cancel hotspot draft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reload document', exact: true })).toBeEnabled();
});

test('rig posing resumes after switching inspector tools', async ({ page, request }, info) => {
  const base = '/api/v1/projects/proj_neon_shogun/branches';
  const before = await (await request.get(`${base}/branch_main/document`)).json();
  const branch = `interaction_rig_${info.project.name}`;
  expect((await request.post(base, { data: {
    commandId: `fork_${branch}`, op: 'forkBranch', projectId: 'proj_neon_shogun',
    sourceBranchId: 'branch_main', expectedRevision: before.document.project.revision,
    newBranchId: branch, name: branch, actor: { kind: 'human', id: 'test' }, reason: 'Isolate inspector test',
  } })).ok()).toBe(true);
  await page.goto(`/studio?branchId=${branch}&projectId=proj_neon_shogun`);
  await page.getByRole('button', { name: 'Add original rig', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  const snapshot = await (await request.get(`${base}/${branch}/document`)).json();
  const layer = snapshot.document.layers.find((item: { rig?: unknown }) => item.rig);
  await page.getByRole('navigation', { name: 'Layer navigator' }).getByRole('button', { name: `Select layer ${layer.name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Add bone frame', exact: true }).click();
  await expect(page.getByLabel('Bone angle', { exact: true })).toBeFocused();
  expect(await page.getByRole('button', { name: 'Add bone frame', exact: true }).evaluate(element => getComputedStyle(element).cursor)).not.toBe('wait');
  await expect(page.getByText('Finish or cancel the open rig draft to edit another pose or frame.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel rig draft', exact: true }).click();
  await page.getByRole('button', { name: 'Edit bone pose', exact: true }).click();
  await page.getByLabel('Bone angle', { exact: true }).fill('37');
  await page.getByRole('button', { name: 'Jobs', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Jobs inspector' })).toBeVisible();
  await page.getByRole('button', { name: 'Close jobs', exact: true }).click();
  await expect(page.getByLabel('Bone angle', { exact: true })).toHaveValue('37');
  await page.getByRole('button', { name: 'Cancel rig draft', exact: true }).click();
  expect((await (await request.get(`${base}/${branch}/document`)).json()).document).toEqual(snapshot.document);
});

test('asset review describes the saved lore document version accurately', async ({ page, request }, info) => {
  const base = '/api/v1/projects/proj_neon_shogun/branches';
  const before = await (await request.get(`${base}/branch_main/document`)).json();
  const branch = `interaction_evidence_${info.project.name}`;
  expect((await request.post(base, { data: {
    commandId: `fork_${branch}`, op: 'forkBranch', projectId: 'proj_neon_shogun',
    sourceBranchId: 'branch_main', expectedRevision: before.document.project.revision,
    newBranchId: branch, name: branch, actor: { kind: 'human', id: 'test' }, reason: 'Isolate version notice test',
  } })).ok()).toBe(true);
  await page.goto(`/studio?branchId=${branch}&projectId=proj_neon_shogun`);
  await page.getByRole('button', { name: 'Add hotspot', exact: true }).click();
  await page.getByLabel('Label', { exact: true }).fill('Version-six lore');
  await page.getByRole('button', { name: 'Review hotspot change', exact: true }).click();
  await page.getByRole('button', { name: 'Save hotspot change', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  await page.getByText('Asset references', { exact: false }).click();
  await page.getByRole('button', { name: /Review evidence/ }).first().click();
  const inspector = page.getByRole('region', { name: 'Asset evidence inspector' });
  await inspector.getByRole('button', { name: 'Edit evidence', exact: true }).click();
  await inspector.getByRole('button', { name: 'Review changes', exact: true }).click();
  await expect(inspector.locator('.asset-review-notice')).toContainText('preserves .cdom 0.6.0');
  await inspector.getByRole('button', { name: 'Save evidence', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  const saved = await (await request.get(`${base}/${branch}/document`)).json();
  expect(saved.document.schemaVersion).toBe('0.6.0');
  expect(saved.document.shots[0].hotspots[0].label).toBe('Version-six lore');
});
