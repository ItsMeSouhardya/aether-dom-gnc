import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { workspacePaths, runtimeEnvironment, assertPortFree, waitReady, stopOwned, child, preflight } from '../presentation/runtime.mjs';
import { freshDirectory, workspaceManifest, verifyBackup } from '../presentation/workspaces.mjs';
import { behaviorDigest, verifyBuild } from '../presentation/build.mjs';

async function temporary() {
  await fs.mkdir('data/stage5-tests', { recursive: true });
  return fs.mkdtemp(path.resolve('data/stage5-tests/case-'));
}

test('workspace slug and fixed paths cannot redirect to regular project', () => {
  for (const id of ['../x', 'C:/x', 'UPPER', '', 'a/b']) assert.throws(() => workspacePaths(process.cwd(), id));
  const ws = workspacePaths(process.cwd(), 'isolated');
  const env = runtimeEnvironment({ AETHER_DATABASE_PATH: 'regular', AETHER_ASSET_ROOT: 'regular', AETHER_API_ORIGIN: 'evil' }, ws, 8300, 'instance');
  assert.equal(env.AETHER_DATABASE_PATH, ws.database);
  assert.equal(env.AETHER_ASSET_ROOT, ws.root);
  assert.equal(env.AETHER_API_ORIGIN, 'http://127.0.0.1:8300');
});

test('occupied listener survives refusal and cleanup owns only supplied children', async () => {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await assert.rejects(assertPortFree(server.address().port), /occupied/);
    await stopOwned([]);
    assert.equal(server.listening, true);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('readiness rejects early exit, wrong identity and finite timeout', async () => {
  await assert.rejects(waitReady({ children: [{ exitCode: 1 }], probe: async () => true, timeout: 20 }), /exited/);
  await assert.rejects(waitReady({ children: [{ exitCode: null }], probe: async () => false, timeout: 30, interval: 5 }), /timed out/);
});

test('cleanup terminates only its directly owned child and waits for exit', async () => {
  const owned = child(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
  await new Promise((resolve, reject) => { owned.once('spawn', resolve); owned.once('error', reject); });
  await stopOwned([owned]);
  assert.ok(owned.exitCode !== null || owned.signalCode !== null);
});

test('preflight refuses missing interpreter and build without starting services', async () => {
  const root = await temporary();
  await assert.rejects(preflight({ root, python: path.join(root, 'missing-python'), env: {} }), /ENOENT/);
  await assert.rejects(verifyBuild(root), /provenance missing/);
});

test('fresh workspace rejects existing roots, redirects and tampered path overrides', async () => {
  const root = await temporary(), ws = workspacePaths(root, 'prepared');
  await freshDirectory(ws.root);
  await assert.rejects(freshDirectory(ws.root), /EEXIST/);
  await fs.writeFile(ws.manifest, JSON.stringify({ version: 1, workspace: ws.id, instance: 'id', prepared: true, database: '../regular.sqlite3', assets: 'assets', projectId: 'p', branchId: 'b' }));
  await assert.rejects(workspaceManifest(ws), /fixed paths/);
  await fs.writeFile(ws.manifest, JSON.stringify({ version: 1, workspace: ws.id, instance: 'id', prepared: true, database: 'workspace.sqlite3', assets: 'assets', projectId: '', branchId: 'branch_main' }));
  await assert.rejects(workspaceManifest(ws), /identity/);
  const alias = path.join(root, 'alias');
  await fs.symlink(ws.root, alias, 'junction');
  await assert.rejects(freshDirectory(path.join(alias, 'new')), /Redirect/);
  assert.equal((await fs.readdir(ws.root)).includes('new'), false);
});

test('build digest binds behavior, lock and landing assets while excluding later docs and captures', async () => {
  const root = await temporary();
  for (const directory of ['apps/api/app', 'apps/api/migrations', 'apps/web/src', 'packages/schema/src', 'packages/schema/fixtures', 'landing-page', 'assets/fixtures', 'tools/presentation', 'tools/checkpoints']) await fs.mkdir(path.join(root, directory), { recursive: true });
  for (const name of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tools/presentation.mjs', 'tools/checkpoints/safety.mjs', 'apps/web/src/runtime.ts', 'landing-page/app.js']) await fs.writeFile(path.join(root, name), 'initial');
  const before = await behaviorDigest(root);
  await fs.mkdir(path.join(root, 'data/presentation'), { recursive: true });
  await fs.mkdir(path.join(root, 'apps/web/.next'), { recursive: true });
  await fs.writeFile(path.join(root, 'apps/web/.next/BUILD_ID'), 'prepared-build');
  await fs.writeFile(path.join(root, 'data/presentation/build.json'), JSON.stringify({ version: 1, buildId: 'prepared-build', ...before }));
  await verifyBuild(root);
  await fs.mkdir(path.join(root, 'docs'));
  await fs.writeFile(path.join(root, 'docs/later.md'), 'documentation');
  await fs.mkdir(path.join(root, 'assets/presentation/task-12'), { recursive: true });
  await fs.writeFile(path.join(root, 'assets/presentation/task-12/landscape.webm'), 'later capture');
  assert.equal((await behaviorDigest(root)).digest, before.digest);
  await fs.writeFile(path.join(root, 'tools/checkpoints/safety.mjs'), 'changed actual imported safety behavior');
  assert.notEqual((await behaviorDigest(root)).digest, before.digest);
  await assert.rejects(verifyBuild(root), /stale/);
  await fs.writeFile(path.join(root, 'apps/web/src/runtime.ts'), 'changed');
  assert.notEqual((await behaviorDigest(root)).digest, before.digest);
});

test('backup verifier refuses malicious paths, missing files and corrupted bytes', async () => {
  const root = await temporary(), directory = path.join(root, 'data/presentation/backups/baseline');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'backup.json'), JSON.stringify({ version: 1, label: 'baseline', files: { '../escape': { sha256: 'a'.repeat(64), size: 1 } } }));
  await assert.rejects(verifyBackup({ root }, 'baseline'), /Unsafe/);
  await fs.writeFile(path.join(directory, 'backup.json'), JSON.stringify({ version: 1, label: 'baseline', files: { 'workspace.sqlite3': { sha256: 'a'.repeat(64), size: 1 }, 'workspace.json': { sha256: 'a'.repeat(64), size: 1 } } }));
  await assert.rejects(verifyBackup({ root }, 'baseline'), /ENOENT/);
  await fs.writeFile(path.join(directory, 'workspace.sqlite3'), 'tampered');
  await assert.rejects(verifyBackup({ root }, 'baseline'), /hash mismatch/);
});
