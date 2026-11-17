import { expect, test } from '@playwright/test';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';

const resources = {
  'styles.css': 'text/css', 'app.js': 'text/javascript', 'cdom-section.js': 'text/javascript',
  'assets/mark.svg': 'image/svg+xml', 'assets/fonts/manrope.woff2': 'font/woff2',
  'assets/afterlight-world.png': 'image/png', 'assets/folio-world.png': 'image/png',
};

test('loads one isolated welcome document, native navigation and local interactive assets without writes', async ({ page, request }, info) => {
  const before = await (await request.get('/api/v1/projects/proj_neon_shogun/branches/branch_main/document')).json();
  const writes: string[] = [], errors: string[] = [], remote: string[] = [];
  page.on('request', req => { if (!['GET', 'HEAD'].includes(req.method())) writes.push(req.url()); if (/^https?:/.test(req.url()) && new URL(req.url()).origin !== 'http://127.0.0.1:3100') remote.push(req.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/welcome?variant=old&keep=yes#idea');
  await expect(page).toHaveURL(/\/welcome\?keep=yes#idea$/);
  expect(await page.locator('html').getAttribute('data-design')).toBe('afterlight-v2');
  await expect(page.locator('script[src*="_next"]')).toHaveCount(0);
  for (const [name, type] of Object.entries(resources)) {
    const response = await request.get(`/welcome-assets/${name}`);
    expect(response.status()).toBe(200); expect(response.headers()['content-type']).toContain(type);
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  }
  for (const path of ['unknown.js', 'assets/fonts/license.txt', '%2e%2e%2findex.html', '__proto__']) expect((await request.get(`/welcome-assets/${path}`)).status()).toBe(404);
  await page.locator('.world-banner').scrollIntoViewIfNeeded();
  expect(await page.locator('img').evaluateAll(async images => { await Promise.all(images.map(image => (image as HTMLImageElement).decode())); return images.every(image => (image as HTMLImageElement).naturalWidth > 0); })).toBe(true);
  expect(await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].some(font => font.family === 'Manrope' && font.status === 'loaded'); })).toBe(true);
  expect(await page.evaluate(async () => { const icon = new Image(); icon.src = '/welcome-assets/assets/mark.svg'; await icon.decode(); return icon.naturalWidth > 0; })).toBe(true);
  await page.getByRole('button', { name: 'Preview story change' }).click();
  await expect(page.locator('#tension')).toHaveValue('82');
  await expect(page.locator('.preview-status')).toContainText('3 connected elements');
  await page.getByRole('button', { name: 'Reset preview' }).click(); await expect(page.locator('#tension')).toHaveValue('35');
  await page.locator('.cdom-figure').scrollIntoViewIfNeeded();
  await expect(page.locator('.cdom-figure')).toHaveAttribute('data-cdom-motion', 'running');
  await page.getByRole('button', { name: 'Pause diagram motion' }).click();
  await expect(page.locator('.cdom-figure')).toHaveAttribute('data-cdom-motion', 'paused');
  await page.getByRole('button', { name: 'Resume diagram motion' }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.cdom-motion-toggle')).toBeDisabled();
  await expect(page.locator('.cdom-figure')).toHaveAttribute('data-cdom-motion', 'reduced');
  if (info.project.name === 'mobile') {
    const menu = page.getByRole('button', { name: 'Menu' });
    await menu.click(); await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await page.locator('#site-nav a').first().focus(); await page.keyboard.press('Escape');
    await expect(menu).toBeFocused(); await expect(menu).toHaveAttribute('aria-expanded', 'false');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('.hero-art').scrollIntoViewIfNeeded();
  if (process.env.AETHER_CAPTURE_WELCOME === '1') await page.screenshot({ path: `.impeccable/review/task12-welcome-${info.project.name}.png`, fullPage: true });
  await expect(page.locator('a[data-studio-action]')).toHaveCount(3);
  for (const selector of ['.hero-actions [data-studio-action]', '.closing [data-studio-action]']) {
    await page.locator(selector).focus(); await page.keyboard.press('Enter');
    await expect(page.locator('main#studio')).toBeVisible();
    await expect(page.locator('link[rel="stylesheet"][href^="/welcome-assets/"]')).toHaveCount(0);
    expect(await page.locator('html').getAttribute('data-design')).toBeNull();
    await expect(page.locator('main#studio')).toHaveCSS('display', 'grid');
    await page.getByRole('link', { name: 'Welcome', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-design', 'afterlight-v2');
  }
  if (info.project.name === 'desktop') {
    await page.locator('.header-cta').click(); await expect(page.locator('main#studio')).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/studio');
    await page.goBack(); await expect(page.locator('.hero-art')).toBeVisible();
    await page.reload(); await expect(page.locator('.hero-art')).toBeVisible();
    await page.goForward(); await expect(page.locator('main#studio')).toBeVisible();
  }
  expect(writes).toEqual([]); expect(errors).toEqual([]); expect(remote).toEqual([]);
  expect((await (await request.get('/api/v1/projects/proj_neon_shogun/branches/branch_main/document')).json()).document).toEqual(before.document);
});

test('preserves only saved API scope and keeps welcome behind draft and reload guards', async ({ page, request }, info) => {
  const snapshot = await (await request.get('/api/v1/projects/proj_neon_shogun/branches/branch_main/document')).json();
  const branchId = `welcome_${info.project.name}`, projectId = 'proj_neon_shogun';
  expect((await request.post(`/api/v1/projects/${projectId}/branches`, { data: { commandId: `fork_${branchId}`, op: 'forkBranch', projectId, sourceBranchId: 'branch_main', expectedRevision: snapshot.document.project.revision, newBranchId: branchId, name: branchId, actor: { kind: 'human', id: 'test' }, reason: 'Isolate welcome scope' } })).ok()).toBe(true);
  const query = `projectId=${projectId}&branchId=${branchId}`;
  await page.goto(`/studio?${query}`);
  await page.getByRole('button', { name: 'Add hotspot' }).click();
  await page.getByLabel('Label', { exact: true }).fill('Retained navigation draft');
  await expect(page.getByRole('link', { name: 'Welcome', exact: true })).toHaveCount(0);
  await expect(page.getByText('Welcome', { exact: true })).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('button', { name: 'Review hotspot change' }).click();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/commands', async route => { await gate; await route.fulfill({ status: 409, contentType: 'application/json', body: '{}' }); });
  await page.getByRole('button', { name: 'Save hotspot change' }).click();
  await expect(page.getByRole('button', { name: 'Cancel hotspot draft' })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Welcome', exact: true })).toHaveCount(0);
  release();
  await expect(page.getByRole('button', { name: 'Reload latest' })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel hotspot draft' }).click();
  await expect(page.getByRole('link', { name: 'Welcome', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Reload latest' }).click();
  await page.getByRole('link', { name: 'Welcome', exact: true }).click();
  await expect(page).toHaveURL(`/welcome?${query}`);
  await expect(page.locator('[data-studio-action]').first()).toHaveAttribute('href', `/studio?${query}`);
  await page.locator('.hero-actions [data-studio-action]').click();
  await page.getByRole('link', { name: 'Player', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Saved composition player' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to studio' })).toHaveAttribute('href', `/studio?${query}`);
  await expect(page.getByRole('link', { name: 'Welcome', exact: true })).toHaveAttribute('href', `/welcome?${query}`);
  const manifest = await (await request.get(`/api/v1/projects/${projectId}/branches/${branchId}/player-manifest`)).json();
  const file = info.outputPath('local-welcome.json'); await writeFile(file, JSON.stringify(manifest));
  await page.getByLabel('Open local player JSON').setInputFiles(file);
  await expect(page.getByText(/Local file · local-welcome.json/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to studio' })).toHaveAttribute('href', '/studio');
  await expect(page.getByRole('link', { name: 'Welcome', exact: true })).toHaveAttribute('href', '/welcome');
  await page.getByRole('link', { name: 'Welcome', exact: true }).click();
  await expect(page.locator('.hero-actions [data-studio-action]')).toHaveAttribute('href', '/studio');
  await page.goto('/welcome?projectId=invalid%0A&branchId=branch_main#questions');
  await expect(page.locator('.hero-actions [data-studio-action]')).toHaveAttribute('href', '/studio');
});

test('keeps welcome disabled until an asset evidence draft is cancelled without writes', async ({ page, request }) => {
  const before = await (await request.get('/api/v1/projects/proj_neon_shogun/branches/branch_main/document')).json();
  const writes: string[] = []; page.on('request', req => { if (!['GET', 'HEAD'].includes(req.method())) writes.push(req.url()); });
  await page.goto('/studio');
  await page.getByText('Asset references', { exact: false }).click();
  await page.getByRole('button', { name: /Review evidence/ }).first().click();
  const panel = page.getByRole('region', { name: 'Asset evidence inspector' });
  await panel.getByRole('button', { name: 'Edit evidence' }).click();
  await expect(page.getByText('Welcome', { exact: true })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('link', { name: 'Welcome', exact: true })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('link', { name: 'Welcome', exact: true }).click();
  await expect(page.locator('.hero-art')).toBeVisible();
  expect(writes).toEqual([]);
  expect((await (await request.get('/api/v1/projects/proj_neon_shogun/branches/branch_main/document')).json()).document).toEqual(before.document);
});

test.describe('standalone source and generated preview', () => {
  const children: ChildProcess[] = [];
  async function serve(production: boolean) {
    const child = spawn(process.execPath, ['tools/serve.mjs', ...(production ? ['--production'] : [])], { cwd: resolve('.'), env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
    children.push(child);
    return await new Promise<string>((resolveUrl, reject) => {
      let text = ''; const timer = setTimeout(() => reject(new Error('Standalone server did not report its owned port')), 10000);
      child.once('error', reject); child.once('exit', code => { clearTimeout(timer); reject(new Error(`Standalone exited ${code}`)); });
      child.stdout!.on('data', chunk => { text += String(chunk); const match = text.match(/http:\/\/127\.0\.0\.1:(\d+)/); if (match) { clearTimeout(timer); resolveUrl(match[0]); } });
    });
  }
  test.afterAll(() => { for (const child of children) child.kill(); });
  for (const production of [false, true]) test(`keeps ${production ? 'built' : 'source'} preview usable with honest setup actions`, async ({ page, request }) => {
    if (production) execFileSync(process.execPath, ['tools/build.mjs'], { cwd: resolve('.'), stdio: 'pipe' });
    const origin = await serve(production);
    const writes: string[] = [], remote: string[] = [], errors: string[] = [];
    page.on('request', req => { if (!['GET', 'HEAD'].includes(req.method())) writes.push(req.url()); if (/^https?:/.test(req.url()) && new URL(req.url()).origin !== origin) remote.push(req.url()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/?variant=old&keep=yes#idea`);
    await expect(page).toHaveURL(`${origin}/?keep=yes#idea`);
    for (const [name, type] of Object.entries(resources)) {
      const response = await request.get(`${origin}/welcome-assets/${name}`); expect(response.status()).toBe(200); expect(response.headers()['content-type']).toContain(type);
    }
    await expect(page.locator('[data-studio-action]')).toHaveCount(3);
    await expect(page.locator('.hero-actions [data-studio-action]')).toHaveText('Set up local studio');
    await page.locator('.hero-actions [data-studio-action]').click();
    await expect(page).toHaveURL(/#local-setup$/); await expect(page.locator('#local-setup')).toHaveAttribute('open', '');
    await expect(page.locator('#local-setup')).toContainText('pnpm dev:api');
    await page.locator('.world-banner').scrollIntoViewIfNeeded();
    expect(await page.locator('img').evaluateAll(async images => { await Promise.all(images.map(image => (image as HTMLImageElement).decode())); return images.every(image => (image as HTMLImageElement).naturalWidth > 0); })).toBe(true);
    expect(await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].some(font => font.family === 'Manrope' && font.status === 'loaded'); })).toBe(true);
    expect(await page.evaluate(async () => { const icon = new Image(); icon.src = '/welcome-assets/assets/mark.svg'; await icon.decode(); return icon.naturalWidth > 0; })).toBe(true);
    await page.getByRole('button', { name: 'Preview story change' }).click(); await expect(page.locator('#tension')).toHaveValue('82');
    await page.getByRole('button', { name: 'Reset preview' }).click(); await expect(page.locator('#tension')).toHaveValue('35');
    await page.locator('.cdom-figure').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Pause diagram motion' }).click();
    await expect(page.locator('.cdom-figure')).toHaveAttribute('data-cdom-motion', 'paused');
    await page.getByRole('button', { name: 'Resume diagram motion' }).click();
    await expect(page.locator('.cdom-figure')).toHaveAttribute('data-cdom-motion', 'running');
    expect((await request.get(`${origin}/welcome`)).status()).toBe(404);
    expect((await request.get(`${origin}/welcome-assets/unknown.js`)).status()).toBe(404);
    expect(writes).toEqual([]); expect(remote).toEqual([]); expect(errors).toEqual([]);
  });
});
