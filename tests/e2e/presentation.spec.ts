import { expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
// Runtime owns and reaps only its own child services.
// @ts-expect-error runtime is an ESM tool without TypeScript declarations
import { configuration, workspacePaths, launch, stopOwned } from '../../tools/presentation/runtime.mjs';

const run = promisify(execFile);

test('fresh presentation journey retains reviewed work and reopens offline', async ({ page }, info) => {
  test.setTimeout(180000);
  const workspace = `e2e-presentation-${randomUUID()}`;
  const env = { ...process.env, PATH: 'C:/Windows/System32', AETHER_DATABASE_PATH: 'data/DO-NOT-USE.sqlite3', AETHER_ASSET_ROOT: 'data/DO-NOT-USE', AETHER_API_ORIGIN: 'http://127.0.0.1:1' };
  await run(process.execPath, ['tools/presentation.mjs', 'setup', '--workspace', workspace], { env, timeout: 60000 });
  const config = await configuration(process.cwd()); config.env = env;
  const ws = workspacePaths(process.cwd(), workspace);
  const owned = await launch(config, ws, { webPort: info.project.name === 'desktop' ? 3331 : 3332, apiPort: info.project.name === 'desktop' ? 8331 : 8332 });
  try {
    expect((await page.request.post(`${owned.origin}/api/auth/register`, { headers: { Origin: owned.origin }, data: { name: 'Presentation tester', email: 'presentation@example.test', password: 'presentation test password' } })).ok()).toBe(true);
    const base = `${owned.origin}/api/v1/projects/proj_neon_shogun/branches/branch_main`;
    const gpu = await page.context().newPage();
    await gpu.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) { if (type === 'webgl2') return null; return original.apply(this, [type, ...args] as Parameters<typeof original>); } as typeof original; });
    await gpu.goto(`${owned.origin}/studio`);
    await expect(gpu.getByRole('region', { name: 'Layered stage' })).toContainText('SVG fallback');
    await expect(gpu.getByRole('button', { name: 'Select stage layer Kael', exact: true })).toBeVisible();
    await gpu.close();
    await page.goto(`${owned.origin}/welcome`);
    await page.locator('.hero-actions [data-studio-action]').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('main#studio')).toBeVisible();
    await page.getByRole('navigation', { name: 'Layer navigator' }).getByRole('button', { name: 'Select layer Kael', exact: true }).click();
    const inspector = page.getByRole('region', { name: 'Inspector' });
    const original = Number(await inspector.getByLabel('X position', { exact: true }).innerText());
    await page.getByRole('button', { name: 'Edit transform', exact: true }).click();
    await page.getByLabel('Edit X position', { exact: true }).fill(String(original + 0.2));
    await page.getByRole('button', { name: 'Save transform', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
    await page.reload();
    await page.getByRole('navigation', { name: 'Layer navigator' }).getByRole('button', { name: 'Select layer Kael', exact: true }).click();
    await expect(inspector.getByLabel('X position', { exact: true })).toHaveText(String(original + 0.2));
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(inspector.getByLabel('X position', { exact: true })).toHaveText(String(original));
    await page.getByRole('button', { name: 'Jobs', exact: true }).click();
    await page.getByLabel('Job scenario', { exact: true }).selectOption('move_right');
    await page.getByRole('button', { name: 'Queue mock job', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Job details' })).toContainText('queued');
    const beforeFailure = await (await page.request.get(`${base}/document`)).json();
    const queued = (await (await page.request.get(`${base}/jobs`)).json()).jobs[0];
    const simulated = { ...queued, status: 'failed', attempt: 1, progress: 25, actualCost: { amount: 0, currency: 'USD' }, nextAttemptAt: new Date(Date.now() + 60000).toISOString(), error: { code: 'PROVIDER_TRANSIENT', message: 'Simulated provider unavailable', retryable: true } };
    await page.route('**/branches/branch_main/jobs', route => route.fulfill({ json: { jobs: [simulated] } }));
    await page.getByRole('button', { name: 'Refresh jobs', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Job details' })).toContainText('failed');
    await expect(page.getByRole('button', { name: 'Cancel job', exact: true })).toBeVisible();
    expect(await (await page.request.get(`${base}/document`)).json()).toEqual(beforeFailure);
    await page.unroute('**/branches/branch_main/jobs');
    await run(process.execPath, ['tools/presentation.mjs', 'worker', '--workspace', workspace, '--once'], { env, timeout: 30000 });
    await page.getByRole('button', { name: 'Refresh jobs', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Job details' })).toContainText('succeeded');
    await page.getByRole('button', { name: 'Review result', exact: true }).click();
    await page.getByRole('button', { name: 'Approve proposal', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Proposal review' })).toContainText('approved');
    const response = await page.request.get(`${owned.origin}/api/v1/projects/proj_neon_shogun/branches/branch_main/player-manifest?use=public_distribution`);
    expect(response.ok()).toBe(true);
    const portable = await response.body();
    await page.goto(`${owned.origin}/player`);
    await page.getByLabel('Open local player JSON').setInputFiles({ name: 'presentation.cdom.json', mimeType: 'application/json', buffer: portable });
    await page.route('**/api/**', route => route.abort());
    for (const aspect of ['16:9', '9:16']) {
      await page.getByLabel('Player aspect ratio').selectOption(aspect);
      const marker = page.getByRole('button', { name: 'Lore: Kael — saved character lore' });
      await marker.focus(); await page.keyboard.press('Enter');
      await expect(page.getByRole('complementary', { name: 'Lore details' })).toContainText('Saved revision');
      await page.keyboard.press('Escape'); await expect(marker).toBeFocused();
    }
    const exporter = page.getByRole('region', { name: 'WebM preview export' });
    await exporter.getByRole('combobox').selectOption('public_distribution');
    await page.getByLabel('WebM clip duration').fill('2');
    for (const [aspect, width, height] of [['16:9', 1280, 720], ['9:16', 720, 1280]] as const) {
      await page.getByLabel('Player aspect ratio').selectOption(aspect);
      await page.getByRole('button', { name: 'Record WebM', exact: true }).click();
      const link = page.getByRole('link', { name: /Download WebM/ });
      await expect(link).toBeVisible({ timeout: 45000 });
      const href = await link.getAttribute('href');
      const dimensions = await page.evaluate(async url => {
        const video = document.createElement('video'); video.src = url!;
        await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error('Video decode failed')); });
        return [video.videoWidth, video.videoHeight];
      }, href);
      expect(dimensions).toEqual([width, height]);
      const download = page.waitForEvent('download'); await link.click();
      expect((await download).suggestedFilename()).toMatch(/\.webm$/);
      const companion = await page.getByRole('link', { name: 'Source + evidence JSON' }).getAttribute('href');
      expect(await page.evaluate(async url => (await fetch(url!)).json(), companion)).toEqual(JSON.parse(portable.toString()));
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await stopOwned(owned.children); }
});
