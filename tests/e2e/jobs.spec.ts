import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const projectId = 'proj_neon_shogun';
const base = (id: string) => `/api/v1/projects/${projectId}/branches/${id}`;
const read = async (request: APIRequestContext, id: string) => (await request.get(`${base(id)}/document`)).json();
async function fixture(page: Page, request: APIRequestContext) {
  const before = await read(request, 'branch_main'), branchId = `branch_job_${crypto.randomUUID()}`;
  expect((await request.post(`/api/v1/projects/${projectId}/branches`, { data: { commandId: crypto.randomUUID(), op: 'forkBranch', projectId, sourceBranchId: 'branch_main', expectedRevision: before.document.project.revision, newBranchId: branchId, name: 'Job test', actor: { kind: 'human', id: 'test' }, reason: 'Isolated job flow' } })).ok()).toBe(true);
  await page.goto(`/studio?projectId=${projectId}&branchId=${branchId}`);
  await page.getByRole('navigation', { name: 'Layer navigator' }).getByRole('button', { name: 'Select layer Kael', exact: true }).click();
  await page.getByRole('button', { name: 'Jobs', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Jobs', exact: true })).toBeVisible();
  return branchId;
}
async function worker(request: APIRequestContext, branchId: string) {
  if (!process.env.AETHER_E2E_DATABASE_PATH) throw new Error('An isolated worker database is required');
  for (let attempt = 0; attempt < 20; attempt++) {
    await promisify(execFile)(process.execPath, [resolve('tools/api.mjs'), 'worker', '--once'], { env: { ...process.env, AETHER_DATABASE_PATH: process.env.AETHER_E2E_DATABASE_PATH, AETHER_ASSET_ROOT: `${process.env.AETHER_E2E_DATABASE_PATH}.assets` }, timeout: 20000 });
    const jobs = (await (await request.get(`${base(branchId)}/jobs`)).json()).jobs;
    if (jobs.every((job: { status: string }) => !['queued', 'running'].includes(job.status))) return;
  }
  throw new Error('The test job did not settle after bounded worker passes');
}
test('queues durably, runs local worker and reviews before one explicit canonical approval', async ({ page, request }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const id = await fixture(page, request), before = await read(request, id);
  await page.getByLabel('Job scenario', { exact: true }).selectOption('move_right');
  await page.getByRole('button', { name: 'Queue mock job', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Job details' })).toContainText('queued');
  expect((await read(request, id))).toEqual(before);
  await page.reload(); await page.getByRole('button', { name: 'Jobs', exact: true }).click();
  await page.getByRole('button', { name: /^Inspect job_/ }).first().click();
  await worker(request, id); await page.getByRole('button', { name: 'Refresh jobs', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Job details' })).toContainText('succeeded');
  await page.getByRole('button', { name: 'Review result', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review proposal', exact: true })).toBeInViewport();
  expect((await read(request, id))).toEqual(before);
  await page.screenshot({ path: info.outputPath('jobs-review.png'), fullPage: true });
  await page.getByRole('button', { name: 'Approve proposal', exact: true }).click();
  await expect.poll(async () => (await read(request, id)).document.project.revision).toBe(before.document.project.revision + 1);
  const after = await read(request, id);
  expect(after.document.layers[1].transform.x).toBeCloseTo(before.document.layers[1].transform.x + .25);
  expect(after.document.layers[2]).toEqual(before.document.layers[2]);
  expect(after.history.entries[0].op).toBe('approveProposal');
  await expect(page.getByRole('region', { name: 'Proposal review' })).toContainText('approved');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('cancels queued work and rejects a stale completion without changing saved history', async ({ page, request }) => {
  const id = await fixture(page, request), before = await read(request, id);
  await page.getByRole('button', { name: 'Queue mock job', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel job', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Job details' })).toContainText('cancelled');
  await worker(request, id); expect((await read(request, id))).toEqual(before);
  await page.getByRole('button', { name: 'Queue mock job', exact: true }).click();
  expect((await request.post(`${base(id)}/commands`, { data: { commandId: crypto.randomUUID(), projectId, branchId: id, expectedRevision: before.document.project.revision, actor: { kind: 'human', id: 'test' }, op: 'setLayerTransform', targetId: 'layer_kael', args: { x: .1 }, reason: 'Advance after enqueue' } })).ok()).toBe(true);
  const advanced = await read(request, id); await worker(request, id);
  await page.getByRole('button', { name: 'Refresh jobs', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Job details' })).toContainText('stale');
  expect(await page.getByRole('button', { name: 'Review result', exact: true }).count()).toBe(0);
  expect((await read(request, id))).toEqual(advanced);
});
test('recovers an unknown enqueue outcome across drawer remount with the same request', async ({ page, request }) => {
  const id = await fixture(page, request); let captured = '', interrupt = true;
  const path = `**${base(id)}/jobs`;
  await page.route(path, async route => {
    if (route.request().method() !== 'POST') { await route.fulfill({ status: 503, json: { detail: { message: 'History unavailable. Refresh jobs.' } } }); return; }
    if (!interrupt) { expect(route.request().postDataJSON().requestId).toBe(captured); await route.continue(); return; }
    captured = route.request().postDataJSON().requestId;
    const response = await route.fetch(); expect(response.ok()).toBe(true);
    await route.fulfill({ status: 503, json: { detail: { message: 'Response interrupted. Retry the same request.' } } });
  });
  await page.getByRole('button', { name: 'Queue mock job', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry enqueue', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close jobs', exact: true }).click();
  interrupt = false;
  await page.getByRole('button', { name: 'Jobs', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry enqueue', exact: true })).toBeVisible();
  await expect(page.getByLabel('Job scenario', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Retry enqueue', exact: true }).click();
  await page.unroute(path);
  await expect.poll(async () => (await (await request.get(`${base(id)}/jobs`)).json()).jobs.length).toBe(1);
  await expect(page.getByRole('button', { name: `Inspect `, exact: false }).first()).toBeVisible();
  const jobs = (await (await request.get(`${base(id)}/jobs`)).json()).jobs;
  expect(jobs[0].request.requestId).toBe(captured);
  expect((await read(request, id)).history.entries).toHaveLength(0);
});

test('recovers unavailable history and keeps completed review decisions across reopening', async ({ page, request }) => {
  const id = await fixture(page, request), before = await read(request, id);
  await page.getByRole('button', { name: 'Queue mock job', exact: true }).click();
  await worker(request, id); await page.getByRole('button', { name: 'Refresh jobs', exact: true }).click();
  await page.getByRole('button', { name: 'Review result', exact: true }).click();
  await page.getByRole('button', { name: 'Reject proposal', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Proposal review' })).toContainText('rejected');
  await page.getByRole('button', { name: 'Close jobs', exact: true }).click();
  const path = `**${base(id)}/jobs`;
  await page.route(path, route => route.fulfill({ status: 503, json: { detail: { message: 'History unavailable. Refresh jobs.' } } }));
  await page.getByRole('button', { name: 'Jobs', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Jobs', exact: true }).getByRole('alert')).toContainText('History unavailable');
  await page.unroute(path); await page.getByRole('button', { name: 'Refresh jobs', exact: true }).click();
  await page.getByRole('button', { name: /^Inspect job_/ }).first().click();
  await page.getByRole('button', { name: 'Review result', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Proposal review' })).toContainText('rejected');
  expect((await read(request, id))).toEqual(before);
});

test('allows cancellation while a transient failure is waiting for its automatic retry', async ({ page, request }) => {
  const id = await fixture(page, request), before = await read(request, id);
  await page.getByRole('button', { name: 'Queue mock job', exact: true }).click();
  const original = (await (await request.get(`${base(id)}/jobs`)).json()).jobs[0];
  const scheduled = { ...original, status: 'failed', attempt: 1, progress: 25, actualCost: { amount: 0, currency: 'USD' }, nextAttemptAt: new Date(Date.now() + 60000).toISOString(), error: { code: 'PROVIDER_TRANSIENT', message: 'The provider disconnected', retryable: true } };
  const path = `**${base(id)}/jobs`;
  await page.route(path, route => route.fulfill({ json: { jobs: [scheduled] } }));
  await page.getByRole('button', { name: 'Refresh jobs', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Job details' })).toContainText('failed');
  await expect(page.getByRole('button', { name: 'Cancel job', exact: true })).toBeVisible();
  await page.unroute(path);
  await page.getByRole('button', { name: 'Cancel job', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Job details' })).toContainText('cancelled');
  expect((await read(request, id))).toEqual(before);
});

test('releases a definitely rejected enqueue so the creator can reload and try fresh work', async ({ page, request }) => {
  const id = await fixture(page, request), before = await read(request, id);
  expect((await request.post(`${base(id)}/commands`, { data: { commandId: crypto.randomUUID(), projectId, branchId: id, expectedRevision: before.document.project.revision, actor: { kind: 'human', id: 'test' }, op: 'setLayerTransform', targetId: 'layer_kael', args: { x: .1 }, reason: 'Concurrent edit before enqueue' } })).ok()).toBe(true);
  await page.getByRole('button', { name: 'Queue mock job', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Jobs', exact: true }).getByRole('alert')).toContainText('Reload');
  await expect(page.getByRole('button', { name: 'Retry enqueue', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Queue mock job', exact: true })).toBeEnabled();
  expect((await (await request.get(`${base(id)}/jobs`)).json()).jobs).toHaveLength(0);
  await page.reload(); await page.getByRole('button', { name: 'Jobs', exact: true }).click();
  await page.getByRole('button', { name: 'Queue mock job', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Job details' })).toContainText('queued');
});

test('lets a slow healthy job history finish instead of aborting it on each poll', async ({ page, request }) => {
  const id = await fixture(page, request);
  await page.getByRole('button', { name: 'Close jobs', exact: true }).click();
  await page.route(`**${base(id)}/jobs`, async route => { await new Promise(resolve => setTimeout(resolve, 3000)); await route.continue(); });
  await page.getByRole('button', { name: 'Jobs', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Job history' })).toContainText('No saved jobs', { timeout: 6500 });
  await expect(page.getByRole('button', { name: 'Queue mock job', exact: true })).toBeEnabled();
});

test('public job proxy preserves duplicate-key rejection without creating a job', async ({ page, request }) => {
  const id = await fixture(page, request), before = await read(request, id);
  const value = { expectedRevision: before.document.project.revision, scopeIds: ['layer_kael'], allowedOps: ['setLayerTransform'], intent: 'move_right', message: '' };
  const raw = '{"requestId":"raw_first","requestId":"raw_second",' + JSON.stringify(value).slice(1);
  const response = await request.post(`${base(id)}/jobs`, { headers: { 'Content-Type': 'application/json' }, data: raw });
  expect(response.status()).toBe(422);
  expect((await (await request.get(`${base(id)}/jobs`)).json()).jobs).toHaveLength(0);
  expect((await read(request, id))).toEqual(before);
});
