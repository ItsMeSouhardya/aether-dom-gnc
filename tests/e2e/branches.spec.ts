import { expect, test } from '@playwright/test';
const project = 'proj_neon_shogun';
const base = (branch: string) => `/api/v1/projects/${project}/branches/${branch}`;
const read = async (request: import('@playwright/test').APIRequestContext, branch = 'branch_main') => (await request.get(`${base(branch)}/document`)).json();
const openBranches = async (page: import('@playwright/test').Page) => {
  await expect(page.getByRole('button', { name: 'Branches', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Branches', exact: true }).click();
};

test('forks and switches isolated saved histories without editing the source', async ({ page, request }, testInfo) => {
  const before = await read(request), name = `Alternate ${testInfo.project.name} ${Date.now()}`;
  await page.goto('/studio'); await openBranches(page);
  await page.getByLabel('Fork name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Create fork', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Branches', exact: true })).toContainText('Fork created');
  const list = await (await request.get(`/api/v1/projects/${project}/branches`)).json();
  const child = list.branches.find((item: { name: string }) => item.name === name);
  expect(child.baseRevision).toBe(before.document.project.revision); expect((await read(request)).document).toEqual(before.document);
  await page.getByLabel('Studio branch', { exact: true }).selectOption(child.id);
  await page.getByRole('button', { name: 'Open branch', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`branchId=${child.id}`));
  await expect(page.getByRole('link', { name: 'Player', exact: true })).toHaveAttribute('href', new RegExp(`branchId=${child.id}`));
  const layer = page.getByRole('button', { name: 'Select stage layer Kael', exact: true }); await layer.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await read(request, child.id)).document.layers[1].transform.x).toBeCloseTo(before.document.layers[1].transform.x + .05);
  expect((await read(request)).document).toEqual(before.document);
  await page.reload(); await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await read(request, child.id)).document.layers).toEqual(before.document.layers);
  await openBranches(page); await page.getByLabel('Studio branch', { exact: true }).selectOption('branch_main');
  await page.getByRole('button', { name: 'Open branch', exact: true }).click();
  await expect.poll(async () => (await read(request)).document).toEqual(before.document);
});

test('shows a true three-way conflict without applying either branch', async ({ page, request }, testInfo) => {
  const before = await read(request), childId = `branch_${crypto.randomUUID()}`;
  const fork = await request.post(`/api/v1/projects/${project}/branches`, { data: { commandId: `fork_${crypto.randomUUID()}`, op: 'forkBranch', projectId: project, sourceBranchId: 'branch_main', expectedRevision: before.document.project.revision, newBranchId: childId, name: `Conflict ${testInfo.project.name}`, actor: { kind: 'human', id: 'test' }, reason: 'Compare alternate layout' } }); expect(fork.ok()).toBe(true);
  const edit = (branchId: string, x: number) => request.post(`${base(branchId)}/commands`, { data: { commandId: crypto.randomUUID(), projectId: project, branchId, expectedRevision: before.document.project.revision, actor: { kind: 'human', id: 'test' }, op: 'setLayerTransform', targetId: 'layer_kael', args: { x }, reason: 'Test divergent edit' } });
  expect((await edit('branch_main', -.2)).ok()).toBe(true);
  try {
    expect((await edit(childId, .3)).ok()).toBe(true);
    const left = await read(request), right = await read(request, childId);
    await page.goto('/studio'); await openBranches(page); await page.getByLabel('Compare branch', { exact: true }).selectOption(childId);
    await page.getByRole('button', { name: 'Compare branches', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Three-way diff' })).toContainText('1 conflict');
    await expect(page.getByRole('region', { name: 'Three-way diff' })).toContainText('layer_kael/transform/x');
    await expect(page.getByRole('region', { name: 'Three-way diff' }).getByRole('heading', { level: 3 })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('branch-diff.png'), fullPage: true });
    expect((await read(request)).document).toEqual(left.document); expect((await read(request, childId)).document).toEqual(right.document);
    expect(await page.getByRole('button', { name: /Apply merge|Merge branches/ }).count()).toBe(0);
  } finally {
    const latest = await read(request); await request.post(`${base('branch_main')}/commands`, { data: { commandId: crypto.randomUUID(), projectId: project, branchId: 'branch_main', expectedRevision: latest.document.project.revision, actor: { kind: 'human', id: 'test' }, op: 'undo', reason: 'Restore isolated test source' } });
  }
});

test('retries an unknown fork outcome with the original command identity', async ({ page, request }) => {
  await page.goto('/studio'); await openBranches(page);
  const name = `Retry ${Date.now()}`; let commandId = '', childId = '';
  await page.route(`**/api/v1/projects/${project}/branches`, async route => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    const value = route.request().postDataJSON(); commandId = value.commandId; childId = value.newBranchId;
    const upstream = await route.fetch(); expect(upstream.ok()).toBe(true);
    await route.fulfill({ status: 503, json: { detail: { message: 'Response interrupted. Retry the same fork.' } } });
  });
  await page.getByLabel('Fork name', { exact: true }).fill(name); await page.getByRole('button', { name: 'Create fork', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry same fork', exact: true })).toBeVisible();
  await expect(page.getByLabel('Fork name', { exact: true })).toBeDisabled();
  await page.unroute(`**/api/v1/projects/${project}/branches`);
  const responseEvent = page.waitForResponse(response => response.url().endsWith(`/projects/${project}/branches`) && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Retry same fork', exact: true }).click();
  expect((await responseEvent).request().postDataJSON()).toMatchObject({ commandId, newBranchId: childId });
  await expect(page.getByRole('region', { name: 'Branches', exact: true })).toContainText('Fork created');
  const list = await (await request.get(`/api/v1/projects/${project}/branches`)).json();
  expect(list.branches.filter((branch: { name: string }) => branch.name === name)).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
