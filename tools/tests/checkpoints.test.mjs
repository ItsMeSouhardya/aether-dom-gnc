import assert from 'node:assert/strict';
import { test } from 'node:test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';

const project = fileURLToPath(new URL('../../', import.meta.url));
const cli = path.join(project, 'tools/checkpoint.mjs');
const api = () => import('../checkpoints/index.mjs');
const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_OPTIONAL_LOCKS: '0' } });
async function fixture(t) {
  const parent = path.join(project, 'data', 'temp', 'checkpoint-tests');
  await fs.mkdir(parent, { recursive: true });
  const sandbox = await fs.mkdtemp(path.join(parent, 'case-'));
  const root = path.join(sandbox, 'repo');
  await fs.mkdir(root);
  // Fake repositories alone are initialized/staged/committed by these tests.
  git(root, 'init', '--quiet');
  git(root, 'config', 'user.email', 'checkpoint@example.invalid');
  git(root, 'config', 'user.name', 'Checkpoint Test');
  git(root, 'config', 'core.autocrlf', 'false');
  await fs.writeFile(path.join(root, '.gitignore'), 'data/\nnode_modules/\n.env\n');
  await fs.writeFile(path.join(root, 'base.txt'), 'base\n');
  await fs.writeFile(path.join(root, 'deleted.txt'), 'delete me\n');
  await fs.writeFile(path.join(root, 'rename old.txt'), 'rename me\n');
  await fs.writeFile(path.join(root, 'binary.bin'), Buffer.from([0, 1, 2, 255]));
  await fs.writeFile(path.join(root, '.env.secret'), 'SECRET_BASE_3491\n');
  await fs.writeFile(path.join(root, '.env.example'), 'API_KEY=example-only\n');
  await fs.writeFile(path.join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  git(root, 'add', '.');
  git(root, 'commit', '--quiet', '-m', 'fixture');
  const report = path.join(sandbox, 'checks.md');
  await fs.writeFile(report, 'Focused verification passed.\n');
  t.after(async () => {
    // Only this test's known isolated root is removed; never production paths.
    assert.ok(sandbox.startsWith(parent + path.sep));
    await fs.rm(sandbox, { recursive: true, force: true });
  });
  return { sandbox, root, report };
}
const capture = async f => (await api()).createCheckpoint({ repoRoot: f.root, label: 'test-checkpoint', checksPath: f.report });
async function mutateManifest(checkpoint, mutate) {
  const name = path.join(checkpoint, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(name, 'utf8'));
  mutate(manifest);
  await fs.writeFile(name, JSON.stringify(manifest));
}

test('exports the checkpoint public interfaces', async () => {
  const exported = await api().catch(() => ({}));
  for (const name of ['createCheckpoint', 'verifyCheckpoint', 'previewCheckpoint']) assert.equal(typeof exported[name], 'function');
});

test('roundtrips full staged/unstaged/binary/untracked/deleted/renamed source without touching index or HEAD', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, 'base.txt'), 'staged\n');
  git(f.root, 'add', 'base.txt');
  await fs.appendFile(path.join(f.root, 'base.txt'), 'unstaged\n');
  await fs.writeFile(path.join(f.root, 'binary.bin'), Buffer.from([0, 255, 42, 0, 128]));
  await fs.unlink(path.join(f.root, 'deleted.txt'));
  git(f.root, 'mv', 'rename old.txt', 'renamed space 🦋.txt');
  await fs.writeFile(path.join(f.root, 'untracked 日本語.txt'), 'complete new source\n');
  await fs.writeFile(path.join(f.root, '.env.secret'), 'SECRET_CHANGED_3491\n');
  await fs.mkdir(path.join(f.root, 'node_modules'));
  await fs.writeFile(path.join(f.root, 'node_modules', 'private.js'), 'runtime dependency');
  const before = { head: git(f.root, 'rev-parse', 'HEAD'), status: git(f.root, 'status', '--porcelain=v1', '-z'), index: await fs.readFile(path.join(f.root, '.git/index')) };
  const { path: checkpoint, manifest } = await capture(f);
  assert.equal(manifest.version, 1);
  assert.equal(manifest.source.head + '\n', before.head);
  assert.ok(manifest.status.some(row => row.path === 'base.txt' && row.index === 'M' && row.worktree === 'M'));
  assert.ok(manifest.status.some(row => row.path === 'renamed space 🦋.txt' && row.originalPath === 'rename old.txt' && row.index === 'R'));
  assert.ok(manifest.deletions.includes('deleted.txt'));
  assert.ok(manifest.dependencyFiles.includes('pnpm-lock.yaml'));
  assert.ok(manifest.exclusions.some(row => row.path === '.env.secret' && row.tracked));
  const patch = await fs.readFile(path.join(checkpoint, 'tracked.patch'), 'utf8');
  assert.match(patch, /GIT binary patch/);
  assert.doesNotMatch(patch, /SECRET_(BASE|CHANGED)_3491/);
  assert.equal(await fs.readFile(path.join(checkpoint, 'checks-report'), 'utf8'), 'Focused verification passed.\n');
  assert.equal((await (await api()).verifyCheckpoint(checkpoint)).files.length, manifest.files.length);
  const destination = path.join(f.sandbox, 'recovered');
  const restored = await (await api()).previewCheckpoint({ checkpointPath: checkpoint, destination, activeRoot: f.root });
  assert.equal(restored.path, destination);
  assert.equal(restored.files, manifest.files.length);
  assert.deepEqual(await fs.readFile(path.join(destination, 'binary.bin')), Buffer.from([0, 255, 42, 0, 128]));
  assert.equal(await fs.readFile(path.join(destination, 'base.txt'), 'utf8'), 'staged\nunstaged\n');
  assert.equal(await fs.readFile(path.join(destination, 'untracked 日本語.txt'), 'utf8'), 'complete new source\n');
  assert.equal(await fs.readFile(path.join(destination, 'renamed space 🦋.txt'), 'utf8'), 'rename me\n');
  for (const absent of ['deleted.txt', 'rename old.txt', '.env.secret', '.git', 'node_modules']) await assert.rejects(fs.lstat(path.join(destination, absent)), { code: 'ENOENT' });
  assert.equal(git(f.root, 'rev-parse', 'HEAD'), before.head);
  assert.equal(git(f.root, 'status', '--porcelain=v1', '-z'), before.status);
  assert.deepEqual(await fs.readFile(path.join(f.root, '.git/index')), before.index);
});

test('staged deletion is absent from restored full source; executable mode is recorded', async t => {
  const f = await fixture(t);
  git(f.root, 'rm', '--quiet', 'deleted.txt');
  await fs.writeFile(path.join(f.root, 'run.sh'), '#!/bin/sh\nexit 0\n');
  git(f.root, 'add', 'run.sh');
  git(f.root, 'update-index', '--chmod=+x', 'run.sh');
  if (process.platform !== 'win32') await fs.chmod(path.join(f.root, 'run.sh'), 0o755);
  const c = await capture(f);
  assert.ok(c.manifest.deletions.includes('deleted.txt'));
  assert.equal(c.manifest.files.find(row => row.path === 'run.sh').mode, '100755');
  const destination = path.join(f.sandbox, 'mode-preview');
  await (await api()).previewCheckpoint({ checkpointPath: c.path, destination, activeRoot: f.root });
  if (process.platform !== 'win32') assert.ok((await fs.stat(path.join(destination, 'run.sh'))).mode & 0o100);
});

test('literal Git pathspec handles glob names without including tracked secrets', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, '[abc].txt'), 'before\n');
  git(f.root, 'add', '--', '[abc].txt');
  git(f.root, 'commit', '--quiet', '-m', 'literal path');
  await fs.writeFile(path.join(f.root, '[abc].txt'), 'after\n');
  await fs.writeFile(path.join(f.root, '.env.secret'), 'SECRET_CHANGED_3491\n');
  const c = await capture(f);
  const diff = await fs.readFile(path.join(c.path, 'tracked.patch'), 'utf8');
  assert.match(diff, /after/);
  assert.doesNotMatch(diff, /SECRET_|\.env.secret/);
});

test('tracked diff excludes omitted secret descendants through both file/directory replacement directions', async t => {
  for (const [direction, name] of [['file-to-directory', 'config'], ['directory-to-file', 'config'], ['file-to-directory', '[config]'], ['directory-to-file', '配置']]) {
    const f = await fixture(t);
    const full = path.join(f.root, name);
    if (direction === 'file-to-directory') {
      await fs.writeFile(full, 'ancestor before\n');
      git(f.root, 'add', '--', name);
      git(f.root, 'commit', '--quiet', '-m', 'ancestor file');
      git(f.root, 'rm', '--quiet', '--', name);
      await fs.mkdir(full);
      await fs.writeFile(path.join(full, '.env'), 'DESCENDANT_SECRET_8472\n');
      await fs.writeFile(path.join(full, 'public.txt'), 'public descendant after\n');
      git(f.root, 'add', '--force', '--', `${name}/.env`, `${name}/public.txt`);
    } else {
      await fs.mkdir(full);
      await fs.writeFile(path.join(full, '.env'), 'DESCENDANT_SECRET_8472\n');
      await fs.writeFile(path.join(full, 'public.txt'), 'public descendant before\n');
      git(f.root, 'add', '--force', '--', `${name}/.env`, `${name}/public.txt`);
      git(f.root, 'commit', '--quiet', '-m', 'ancestor directory');
      git(f.root, 'rm', '--quiet', '-r', '--', name);
      await fs.writeFile(full, 'ancestor after\n');
      git(f.root, 'add', '--', name);
    }
    const c = await capture(f);
    const diff = await fs.readFile(path.join(c.path, 'tracked.patch'), 'utf8');
    assert.doesNotMatch(diff, /DESCENDANT_SECRET_8472|\/\.env/, `${direction}: ${name}`);
    assert.match(diff, direction === 'file-to-directory' ? /ancestor before/ : /ancestor after/);
    assert.match(diff, direction === 'file-to-directory' ? /public descendant after/ : /public descendant before/);
    assert.ok(c.manifest.exclusions.some(row => row.path === `${name}/.env` && row.tracked));
    assert.ok(!c.manifest.files.some(row => row.path === `${name}/.env`));
  }
});

test('duplicate labels and unsafe labels are refused without replacing a checkpoint', async t => {
  const f = await fixture(t);
  const c = await capture(f);
  const before = await fs.readFile(path.join(c.path, 'manifest.json'));
  await assert.rejects(capture(f), /exist|label/i);
  for (const label of ['../escape', 'CON', 'a:b', 'x.', 'X X', '']) await assert.rejects((await api()).createCheckpoint({ repoRoot: f.root, label, checksPath: f.report }));
  assert.deepEqual(await fs.readFile(path.join(c.path, 'manifest.json')), before);
});

test('corrupted and missing payload, changed report and extra files fail integrity verification', async t => {
  for (const kind of ['corrupt', 'missing', 'report', 'extra']) {
    const f = await fixture(t);
    const c = await capture(f);
    if (kind === 'corrupt') await fs.writeFile(path.join(c.path, 'source/base.txt'), 'evil\n');
    if (kind === 'missing') await fs.unlink(path.join(c.path, 'source/base.txt'));
    if (kind === 'report') await fs.appendFile(path.join(c.path, 'checks-report'), 'changed');
    if (kind === 'extra') await fs.writeFile(path.join(c.path, 'source/extra.txt'), 'unlisted');
    await assert.rejects((await api()).verifyCheckpoint(c.path));
    await assert.rejects((await api()).previewCheckpoint({ checkpointPath: c.path, destination: path.join(f.sandbox, 'invalid-preview'), activeRoot: f.root }));
    await assert.rejects(fs.lstat(path.join(f.sandbox, 'invalid-preview')), { code: 'ENOENT' });
  }
});

test('hostile manifest paths and case aliases are rejected before destination creation', async t => {
  const f = await fixture(t);
  const c = await capture(f);
  const original = await fs.readFile(path.join(c.path, 'manifest.json'));
  for (const bad of ['../escape', '/absolute', 'C:/evil', '//server/share', 'a\\b', 'foo:stream', 'NUL.txt', 'CONIN$', 'a./b', 'a /b', 'a//b', 'a/../b', '.git/config', 'node_modules/x', '.env.production', 'lpt1.log', 'a\u0000b']) {
    await fs.writeFile(path.join(c.path, 'manifest.json'), original);
    await mutateManifest(c.path, m => { m.files[0].path = bad; });
    await assert.rejects((await api()).verifyCheckpoint(c.path), /Unsafe|Excluded/, bad);
  }
  await fs.writeFile(path.join(c.path, 'manifest.json'), original);
  await mutateManifest(c.path, m => { m.files.push({ ...m.files[0], path: m.files[0].path.toUpperCase() }); });
  await assert.rejects((await api()).verifyCheckpoint(c.path));
});

test('rejects malformed metadata, unsupported versions, hash/size/mode corruption and incomplete publication', async t => {
  const f = await fixture(t);
  const c = await capture(f);
  const original = await fs.readFile(path.join(c.path, 'manifest.json'));
  for (const mutate of [m => { m.version = 2; }, m => { m.files[0].size = -1; }, m => { m.files[0].sha256 = 'wrong'; }, m => { m.files[0].mode = '120000'; }, m => { m.files[0].extra = true; }, m => { m.source.head = 'branch-name'; }, m => { m.files = {}; }, m => { m.artifacts.diff.path = '../outside'; }]) {
    await fs.writeFile(path.join(c.path, 'manifest.json'), original);
    await mutateManifest(c.path, mutate);
    await assert.rejects((await api()).verifyCheckpoint(c.path));
  }
  await fs.writeFile(path.join(c.path, 'manifest.json'), original);
  await fs.writeFile(path.join(c.path, 'INCOMPLETE'), 'quarantine');
  await assert.rejects((await api()).verifyCheckpoint(c.path));
});

test('preview refuses existing/source/ancestor/source-descendant destinations; permits dedicated ignored preview area', async t => {
  const f = await fixture(t);
  const c = await capture(f);
  const preview = (destination) => (api().then(a => a.previewCheckpoint({ checkpointPath: c.path, destination, activeRoot: f.root })));
  for (const dest of [f.root, f.sandbox, path.join(f.root, 'arbitrary-new-dir'), c.path]) await assert.rejects(preview(dest));
  const destination = path.join(f.root, 'data/checkpoint-previews/safe');
  await preview(destination);
  assert.equal(await fs.readFile(path.join(destination, 'base.txt'), 'utf8'), 'base\n');
  await assert.rejects(preview(destination));
});

test('hardlinked source and checkpoint payload are refused', async t => {
  const f = await fixture(t);
  const outside = path.join(f.sandbox, 'outside.txt');
  await fs.writeFile(outside, 'outside remains unchanged');
  await fs.link(outside, path.join(f.root, 'linked.txt'));
  await assert.rejects(capture(f), /link|regular/i);
  await fs.unlink(path.join(f.root, 'linked.txt'));
  const c = await capture(f);
  await fs.unlink(path.join(c.path, 'source/base.txt'));
  await fs.link(outside, path.join(c.path, 'source/base.txt'));
  await assert.rejects((await api()).verifyCheckpoint(c.path));
  assert.equal(await fs.readFile(outside, 'utf8'), 'outside remains unchanged');
});

test('visible redirected source/output/preview ancestors are refused without external writes', async t => {
  const f = await fixture(t);
  const outside = path.join(f.sandbox, 'outside');
  await fs.mkdir(outside);
  try { await fs.symlink(outside, path.join(f.root, 'redirect'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) return t.skip(`host cannot create redirect: ${error.code}`); throw error; }
  await fs.writeFile(path.join(outside, 'file.txt'), 'external');
  await assert.rejects(capture(f), /redirect|symbolic|link/i);
  await fs.unlink(path.join(f.root, 'redirect'));
  const c = await capture(f);
  await fs.symlink(outside, path.join(f.sandbox, 'alias'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects((await api()).previewCheckpoint({ checkpointPath: c.path, destination: path.join(f.sandbox, 'alias/new'), activeRoot: f.root }));
  await fs.rename(path.join(f.root, 'data/checkpoints'), path.join(f.root, 'data/checkpoints-original'));
  await fs.symlink(outside, path.join(f.root, 'data/checkpoints'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects((await api()).createCheckpoint({ repoRoot: f.root, label: 'redirected', checksPath: f.report }));
  assert.deepEqual(await fs.readdir(outside), ['file.txt']);
});

test('oversized source is rejected before reading or publishing payload', async t => {
  const f = await fixture(t);
  const handle = await fs.open(path.join(f.root, 'too-big.bin'), 'w');
  await handle.truncate(64 * 1024 * 1024 + 1);
  await handle.close();
  await assert.rejects(capture(f), /limit|large|size/i);
});

test('aggregate source size and manifest count/total limits fail closed', async t => {
  const f = await fixture(t);
  const c = await capture(f);
  const original = await fs.readFile(path.join(c.path, 'manifest.json'));
  await mutateManifest(c.path, m => { m.files = Array.from({ length: 10001 }, (_, i) => ({ ...m.files[0], path: `file-${i}.txt` })); });
  await assert.rejects((await api()).verifyCheckpoint(c.path), /limit/i);
  await fs.writeFile(path.join(c.path, 'manifest.json'), original);
  await mutateManifest(c.path, m => { m.files = Array.from({ length: 9 }, (_, i) => ({ ...m.files[0], path: `file-${i}.txt`, size: 64 * 1024 * 1024 })); m.dependencyFiles = []; });
  await assert.rejects((await api()).verifyCheckpoint(c.path), /limit/i);
  for (let i = 0; i < 9; i++) {
    const handle = await fs.open(path.join(f.root, `large-${i}.bin`), 'w');
    await handle.truncate(64 * 1024 * 1024);
    await handle.close();
  }
  await assert.rejects((await api()).createCheckpoint({ repoRoot: f.root, label: 'too-large', checksPath: f.report }), /limit/i);
});

test('many long literal tracked paths fit Windows Git argument limits', async t => {
  const f = await fixture(t);
  const names = Array.from({ length: 350 }, (_, i) => `long-literal-[${i}]-${'a'.repeat(80)}.txt`);
  for (const name of names) await fs.writeFile(path.join(f.root, name), 'before\n');
  git(f.root, 'add', '.');
  git(f.root, 'commit', '--quiet', '-m', 'long paths');
  for (const name of names) await fs.writeFile(path.join(f.root, name), 'after\n');
  const c = await capture(f);
  const diff = await fs.readFile(path.join(c.path, 'tracked.patch'), 'utf8');
  assert.equal((diff.match(/^diff --git /gm) || []).length, 350);
  assert.ok(diff.includes(names[0]));
  assert.ok(diff.includes(names.at(-1)));
});

test('preview preserves a legitimate source file named INCOMPLETE', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, 'INCOMPLETE'), 'legitimate source\n');
  const c = await capture(f);
  const destination = path.join(f.sandbox, 'marker-preview');
  await (await api()).previewCheckpoint({ checkpointPath: c.path, destination, activeRoot: f.root });
  assert.equal(await fs.readFile(path.join(destination, 'INCOMPLETE'), 'utf8'), 'legitimate source\n');
});

test('full source reconstruction supports tracked file/directory replacements', async t => {
  for (const direction of ['file-to-directory', 'directory-to-file']) {
    const f = await fixture(t);
    if (direction === 'file-to-directory') {
      await fs.unlink(path.join(f.root, 'base.txt'));
      await fs.mkdir(path.join(f.root, 'base.txt'));
      await fs.writeFile(path.join(f.root, 'base.txt/child.txt'), 'nested replacement\n');
    } else {
      await fs.mkdir(path.join(f.root, 'nested'));
      await fs.writeFile(path.join(f.root, 'nested/child.txt'), 'old nested\n');
      git(f.root, 'add', '.');
      git(f.root, 'commit', '--quiet', '-m', 'nested source');
      await fs.unlink(path.join(f.root, 'nested/child.txt'));
      await fs.rmdir(path.join(f.root, 'nested'));
      await fs.writeFile(path.join(f.root, 'nested'), 'flat replacement\n');
    }
    const c = await capture(f);
    const destination = path.join(f.sandbox, 'replacement-preview');
    await (await api()).previewCheckpoint({ checkpointPath: c.path, destination, activeRoot: f.root });
    assert.equal(await fs.readFile(path.join(destination, direction === 'file-to-directory' ? 'base.txt/child.txt' : 'nested'), 'utf8'), direction === 'file-to-directory' ? 'nested replacement\n' : 'flat replacement\n');
  }
});

test('invalid destination components after a missing ancestor are rejected before creating parents', async t => {
  const f = await fixture(t);
  const c = await capture(f);
  const destination = path.join(f.sandbox, 'not-created', 'CON.txt');
  await assert.rejects((await api()).previewCheckpoint({ checkpointPath: c.path, destination, activeRoot: f.root }), /Unsafe/);
  await assert.rejects(fs.lstat(path.dirname(destination)), { code: 'ENOENT' });
});

test('CLI create/verify/preview and strict argument failures use the same public boundary', async t => {
  const f = await fixture(t);
  const run = (...args) => execFileSync(process.execPath, [cli, ...args], { cwd: f.root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const result = JSON.parse(run('create', '--label', 'cli-capture', '--checks', f.report));
  assert.equal(JSON.parse(run('verify', '--checkpoint', result.path)).version, 1);
  const destination = path.join(f.sandbox, 'cli-preview');
  assert.equal(JSON.parse(run('preview', '--checkpoint', result.path, '--destination', destination)).path, destination);
  for (const args of [[], ['create', '--label', 'x'], ['verify', '--checkpoint', result.path, '--oops', 'x'], ['verify', '--checkpoint', result.path, '--checkpoint', result.path]]) assert.throws(() => run(...args));
  assert.equal(await fs.readFile(path.join(destination, 'base.txt'), 'utf8'), 'base\n');
});

test('capture detects a source change during bounded capture and quarantines incomplete output', async t => {
  const f = await fixture(t);
  for (let i = 0; i < 50; i++) await fs.writeFile(path.join(f.root, `slow-${i}.bin`), Buffer.alloc(128 * 1024, i));
  const child = spawn(process.execPath, ['--input-type=module', '-e', `import fs from 'node:fs';setInterval(()=>fs.appendFileSync(process.argv[1], 'x'), 2);` , path.join(f.root, 'base.txt')], { stdio: 'ignore' });
  t.after(() => child.kill());
  // A positive handshake ensures the writer is active rather than racing process startup.
  for (let i = 0; i < 100 && (await fs.stat(path.join(f.root, 'base.txt'))).size === 5; i++) await new Promise(resolve => setTimeout(resolve, 10));
  await assert.rejects(capture(f), /chang|consisten|stable/i);
  child.kill();
  const entries = await fs.readdir(path.join(f.root, 'data/checkpoints'));
  for (const entry of entries) await assert.rejects((await api()).verifyCheckpoint(path.join(f.root, 'data/checkpoints', entry)));
});

test('capture refuses source enumeration additions after the payload copy starts', async t => {
  const f = await fixture(t);
  for (let i = 0; i < 40; i++) await fs.writeFile(path.join(f.root, `capture-${i}.txt`), 'source\n');
  const ready = path.join(f.sandbox, 'watcher-ready');
  const code = `import fs from 'node:fs';import path from 'node:path';const [root,ready]=process.argv.slice(1);fs.writeFileSync(ready,'ready');const timer=setInterval(()=>{try{const out=path.join(root,'data/checkpoints');for(const name of fs.readdirSync(out)){if(name.startsWith('.incomplete-')&&fs.existsSync(path.join(out,name,'source'))){fs.writeFileSync(path.join(root,'late-added.txt'),'late source addition');clearInterval(timer);return;}}}catch{}},2);`;
  const watcher = spawn(process.execPath, ['--input-type=module', '-e', code, f.root, ready], { stdio: 'ignore' });
  t.after(() => watcher.kill());
  let started = false;
  for (let i = 0; i < 100; i++) {
    try { await fs.lstat(ready); started = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 10)); }
  }
  assert.ok(started, 'enumeration watcher is active before capture');
  await assert.rejects(capture(f), /enumeration.*changed/i);
  assert.equal(await fs.readFile(path.join(f.root, 'late-added.txt'), 'utf8'), 'late source addition');
});
