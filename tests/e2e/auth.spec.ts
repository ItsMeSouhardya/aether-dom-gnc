import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('root opens the landing instead of the editor', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero-copy')).toBeVisible();
  await expect(page.locator('#studio')).toHaveCount(0);
});

test('direct editor and project API access require login', async ({ page, request }) => {
  await page.goto('/studio?projectId=proj_neon_shogun&branchId=branch_main');
  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  const response = await request.get('/api/v1/projects/proj_neon_shogun/branches/branch_main/document');
  expect(response.status()).toBe(401);
});

test('logs in, preserves saved scope, logs out and rejects the old session', async ({ page, context, request }) => {
  await page.goto('/studio?projectId=proj_neon_shogun&branchId=branch_main');
  await page.getByLabel('Email', { exact: true }).fill('creator@example.test');
  await page.getByLabel('Password', { exact: true }).fill('incorrect password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'Login error' })).toContainText('incorrect');
  await page.getByLabel('Password', { exact: true }).fill('test-only local password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/studio\?projectId=proj_neon_shogun&branchId=branch_main$/);
  await expect(page.locator('#studio')).toBeVisible();
  const token = (await context.cookies()).find(cookie => cookie.name === 'aether_session')!;
  expect(token.httpOnly).toBe(true); expect(token.sameSite).toBe('Lax');
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page.locator('.hero-copy')).toBeVisible();
  expect((await request.get('/api/v1/projects/proj_neon_shogun/branches/branch_main/document', { headers: { Cookie: `aether_session=${token.value}` } })).status()).toBe(401);
  await page.goBack();
  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.locator('#studio')).toHaveCount(0);
});

test('rejects cross-origin authentication and external return paths', async ({ page, request }) => {
  expect((await request.post('/api/auth/login', { headers: { Origin: 'https://elsewhere.invalid' }, data: { email: 'creator@example.test', password: 'test-only local password' } })).status()).toBe(403);
  await page.goto('/login?next=https://elsewhere.invalid');
  await page.getByLabel('Email', { exact: true }).fill('creator@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-only local password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/);
});

test('keeps the hero copy centered and its actions visible at browser-sized viewports', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [[1536, 730], [1920, 920], [1024, 768]]) {
    await page.setViewportSize({ width, height }); await page.goto('/');
    const box = await page.locator('.hero-copy').boundingBox();
    expect(box!.y).toBeGreaterThan(85);
    expect(box!.y + box!.height).toBeLessThan(height - 45);
    expect(Math.abs(box!.y + box!.height / 2 - height / 2)).toBeLessThan(30);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
