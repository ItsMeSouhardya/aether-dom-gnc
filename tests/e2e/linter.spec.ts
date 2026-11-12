import { expect, test, type Page } from '@playwright/test';

const base = '/api/v1/projects/proj_neon_shogun/branches/branch_main';
const conflict = (page: Page) => page.getByRole('article', { name: 'CANON_PHYSICAL_CONFLICT layer_kael', exact: true });
async function selectKael(page: Page) {
  await page.getByRole('navigation', { name: 'Layer navigator' }).getByRole('button', { name: 'Select layer Kael', exact: true }).click();
}
function authored(document: Record<string, unknown>) {
  const value = structuredClone(document) as { project: { revision: number }; branches: { headRevision: number }[] };
  value.project.revision = 0; value.branches.forEach(branch => { branch.headRevision = 0; });
  return value;
}

test('explains the injured-arm conflict with evidence and inspectable dependencies', async ({ page }, testInfo) => {
  await page.goto('/');
  await selectKael(page);
  await page.getByRole('button', { name: 'Diagnostics', exact: true }).click();
  await expect(conflict(page)).toContainText('event_injury');
  await expect(conflict(page)).toContainText('constraint_kael_left_arm');
  await expect(page.getByRole('region', { name: 'Diagnostics tray' }).getByText(/asset files need attention/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('linter.png'), fullPage: true, scale: 'css' });
  await page.getByRole('navigation', { name: 'Layer navigator' }).getByRole('button', { name: 'Select layer Vance', exact: true }).click();
  await conflict(page).getByRole('button', { name: 'Select affected layer', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Inspector' }).getByLabel('Saved pose')).toHaveText('lifting with left arm');
  await page.getByRole('button', { name: 'Dependencies', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Dependency impact' })).toContainText('char_kael');
  await expect(page.getByRole('region', { name: 'Dependency impact' })).toContainText('shot_rooftop');
});

test('repairs a pose, keeps it after reload and restores the conflict on undo', async ({ page, request }) => {
  const before = await (await request.get(`${base}/document`)).json();
  await page.goto('/'); await selectKael(page);
  await page.getByRole('button', { name: 'Edit pose', exact: true }).click();
  await page.getByLabel('Draft pose', { exact: true }).selectOption('lifting_with_right_arm');
  await page.getByRole('button', { name: 'Save pose', exact: true }).click();
  await expect(page.getByLabel('Saved pose')).toHaveText('lifting with right arm');
  await page.reload(); await selectKael(page);
  await expect(page.getByLabel('Saved pose')).toHaveText('lifting with right arm');
  await page.getByRole('button', { name: 'Diagnostics', exact: true }).click();
  await expect(conflict(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(conflict(page)).toBeVisible();
  const after = await (await request.get(`${base}/document`)).json();
  expect(authored(after.document)).toEqual(authored(before.document));
});

test('reviews and records recovery as an exact reversible story event', async ({ page, request }, testInfo) => {
  const before = await (await request.get(`${base}/document`)).json();
  await page.goto('/'); await selectKael(page);
  await page.getByRole('button', { name: 'Review recovery', exact: true }).click();
  await page.getByLabel('Recovery description', { exact: true }).fill('Kael recovers after treatment before the rooftop scene.');
  await expect(page.getByRole('form', { name: 'Record constraint recovery' })).toContainText('before this scene');
  await page.screenshot({ path: testInfo.outputPath('recovery-review.png'), fullPage: true, scale: 'css' });
  await page.getByRole('button', { name: 'Record recovery', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  const saved = await (await request.get(`${base}/document`)).json();
  const resolution = saved.document.characters[0].constraints[0].resolvedByEventId;
  expect(resolution).toBeTruthy();
  expect(saved.document.events.find((event: { id: string }) => event.id === resolution).description).toContain('after treatment');
  expect(saved.analysis.issues.some((issue: { code: string }) => issue.code === 'CANON_PHYSICAL_CONFLICT')).toBe(false);
  await page.reload(); await selectKael(page);
  await expect(page.getByRole('region', { name: 'Inspector' })).toContainText(resolution);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  const restored = await (await request.get(`${base}/document`)).json();
  expect(authored(restored.document)).toEqual(authored(before.document));
});

test('omits navigation that cannot select an orphan layer', async ({ page, request }) => {
  const snapshot = await (await request.get(`${base}/document`)).json();
  snapshot.document.shots[0].layerIds = snapshot.document.shots[0].layerIds.filter((id: string) => id !== 'layer_kael');
  await page.route(`**${base}/document`, route => route.fulfill({ json: snapshot }));
  await page.goto('/'); await page.getByRole('button', { name: 'Diagnostics', exact: true }).click();
  await expect(conflict(page)).toBeVisible();
  await expect(conflict(page).getByRole('button', { name: 'Select affected layer', exact: true })).toHaveCount(0);
});

test('checks dialect continuously in an unsaved draft without changing canon', async ({ page, request }) => {
  const before = await (await request.get(`${base}/document`)).json();
  await page.goto('/'); await selectKael(page);
  await page.getByLabel('Dialect draft text', { exact: true }).fill('KINDLY leave, your excellency.');
  const checker = page.getByRole('region', { name: 'Dialect draft check' });
  await expect(checker).toContainText('kindly');
  await expect(checker).toContainText('your excellency');
  await expect(checker.getByRole('status')).toContainText('2 forbidden terms');
  await page.getByLabel('Dialect draft text', { exact: true }).fill('Unkindly handled.');
  await expect(checker.getByRole('status')).toContainText('No forbidden terms');
  expect((await (await request.get(`${base}/document`)).json()).document).toEqual(before.document);
  await page.reload(); await selectKael(page);
  await expect(page.getByLabel('Dialect draft text', { exact: true })).toHaveValue('');
});

test('rejects a stale pose review without silently rebasing it', async ({ page, context, request }) => {
  const other = await context.newPage();
  await page.goto('/'); await other.goto('/'); await selectKael(page); await selectKael(other);
  await other.getByRole('button', { name: 'Edit pose', exact: true }).click();
  await other.getByLabel('Draft pose', { exact: true }).selectOption('lifting_with_right_arm');
  await page.getByRole('button', { name: 'Edit pose', exact: true }).click();
  await page.getByLabel('Draft pose', { exact: true }).selectOption('standing');
  await page.getByRole('button', { name: 'Save pose', exact: true }).click();
  await expect(page.getByLabel('Saved pose')).toHaveText('standing');
  await other.getByRole('button', { name: 'Save pose', exact: true }).click();
  await expect(other.getByRole('alert', { name: 'Save status' })).toContainText('Reload latest');
  expect((await (await request.get(`${base}/document`)).json()).document.layers[1].pose).toBe('standing');
  await other.close();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByLabel('Saved pose')).toHaveText('lifting with left arm');
});
