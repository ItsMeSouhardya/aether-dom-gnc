import { expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
// @ts-expect-error runtime is an ESM tool without TypeScript declarations
import { configuration, workspacePaths, launch, stopOwned } from '../../tools/presentation/runtime.mjs';

test.use({ storageState: { cookies: [], origins: [] } });

test('creates the first local account through the landing and retains it after logout', async ({ page }, info) => {
  test.setTimeout(120000);
  const workspace = `e2e-auth-${randomUUID()}`;
  await promisify(execFile)(process.execPath, ['tools/presentation.mjs', 'setup', '--workspace', workspace], { timeout: 60000 });
  const config = await configuration(process.cwd());
  config.env.AETHER_AUTH_PATH = `${workspacePaths(process.cwd(), workspace).root}/local-auth.sqlite3`;
  const owned = await launch(config, workspacePaths(process.cwd(), workspace), { webPort: info.project.name === 'desktop' ? 3341 : 3342, apiPort: info.project.name === 'desktop' ? 8341 : 8342 });
  try {
    await page.goto(owned.origin);
    await expect(page.locator('.hero-copy')).toBeVisible();
    await page.locator('.hero-actions [data-studio-action]').click();
    await expect(page.getByRole('heading', { name: 'Create your local account' })).toBeVisible();
    await page.getByLabel('Your name', { exact: true }).fill('Local creator');
    await page.getByLabel('Email', { exact: true }).fill('new@example.test');
    await page.getByLabel('Password', { exact: true }).fill('a new local password');
    await page.getByLabel('Confirm password', { exact: true }).fill('does not match');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.getByRole('alert', { name: 'Login error' })).toContainText('do not match');
    await page.getByLabel('Confirm password', { exact: true }).fill('a new local password');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page).toHaveURL(`${owned.origin}/studio`);
    await expect(page.locator('#studio')).toBeVisible();
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await expect(page.locator('.hero-copy')).toBeVisible();
    await page.goto(`${owned.origin}/studio`);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await page.getByLabel('Email', { exact: true }).fill('new@example.test');
    await page.getByLabel('Password', { exact: true }).fill('a new local password');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page.locator('#studio')).toBeVisible();
    await page.screenshot({ path: info.outputPath('signed-in-studio.png'), fullPage: true });
    await promisify(execFile)(process.execPath, ['tools/presentation.mjs', 'capture', '--workspace', workspace, '--origin', owned.origin, '--channel', 'msedge', '--out', info.outputPath('authenticated-workspace-capture')], { timeout: 90000, maxBuffer: 4 * 1024 * 1024 });
  } finally { await stopOwned(owned.children); }
});
