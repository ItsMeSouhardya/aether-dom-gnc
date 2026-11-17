import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { LIMITS, MANIFEST_LIMIT, slug, exclusion, uniquePaths, inside, safePath, ensureDirectory, inspectFile, readStable, writeNew, hash } from './safety.mjs';
import { gitState, trackedDiff } from './git.mjs';
import { validateManifest, verifyCheckpoint } from './manifest.mjs';

export { verifyCheckpoint } from './manifest.mjs';
const descriptor = (name, bytes) => ({ path: name, size: bytes.length, sha256: hash(bytes) });
const dependency = name => /(?:^|\/)(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?|pyproject\.toml|uv\.lock|poetry\.lock|requirements[^/]*\.txt|Pipfile(?:\.lock)?)$/.test(name);

export async function createCheckpoint({ repoRoot, label, checksPath }) {
  slug(label);
  const root = await safePath(repoRoot);
  const checks = await safePath(path.resolve(root, checksPath));
  if (exclusion(path.basename(checks)) || checks.split(/[\\/]/).some(part => ['.git', '.aws', '.ssh', '.gnupg'].includes(part.toLowerCase())) || !/\.(?:md|txt|json|log)$/i.test(checks)) throw new Error('Checks must be a non-secret .md/.txt/.json/.log verification report');
  const report = await readStable(checks);
  const output = await ensureDirectory(path.join(root, 'data/checkpoints'));
  const final = path.join(output, label);
  await safePath(final, { missing: true });
  try { await fs.lstat(final); throw new Error('Checkpoint label already exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const staging = path.join(output, `.incomplete-${label}-${randomUUID()}`);
  await fs.mkdir(staging);
  try {
    const state = await gitState(root);
    const tracked = new Set([...state.index, ...state.base].map(item => item.path));
    const modes = new Map([...state.base, ...state.index].map(item => [item.path, item.mode]));
    const exclusions = [];
    const selected = [];
    for (const name of state.names) {
      const reason = exclusion(name);
      if (reason) exclusions.push({ path: name, reason, tracked: tracked.has(name) });
      else selected.push(name);
    }
    if (selected.length > LIMITS.files) throw new Error('Source file count limit exceeded');
    uniquePaths(selected, { allowAncestors: true });
    let estimatedTotal = report.size;
    for (const name of selected) {
      if (modes.has(name) && !['100644', '100755'].includes(modes.get(name))) throw new Error(`Unsupported tracked file type: ${name}`);
      try { estimatedTotal += (await inspectFile(path.join(root, ...name.split('/')))).size; }
      catch (error) { if (!(['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code) && tracked.has(name))) throw error; }
      if (estimatedTotal > LIMITS.totalBytes) throw new Error('Source total size limit exceeded');
    }
    const files = [], deletions = [], observations = new Map();
    let total = report.size;
    for (const name of selected) {
      const absolute = path.join(root, ...name.split('/'));
      let file;
      try { file = await readStable(absolute); } catch (error) {
        if (['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code) && tracked.has(name)) { deletions.push(name); continue; }
        throw error;
      }
      if (modes.has(name) && !['100644', '100755'].includes(modes.get(name))) throw new Error(`Unsupported tracked file type: ${name}`);
      total += file.size;
      if (total > LIMITS.totalBytes) throw new Error('Source total size limit exceeded');
      const mode = process.platform === 'win32' ? (modes.get(name) || file.mode) : file.mode;
      files.push({ path: name, size: file.size, sha256: file.sha256, mode, tracked: tracked.has(name) });
      observations.set(name, file.identity);
      await writeNew(path.join(staging, 'source', ...name.split('/')), file.bytes, mode === '100755' ? 0o755 : 0o644);
    }
    // Excluded names have been removed before Git is allowed to read diff bytes.
    const patch = await trackedDiff(root, state, selected.filter(name => tracked.has(name)));
    total += patch.length;
    if (total > LIMITS.totalBytes) throw new Error('Checkpoint total size limit exceeded');
    await writeNew(path.join(staging, 'tracked.patch'), patch);
    await writeNew(path.join(staging, 'checks-report'), report.bytes);
    for (const file of files) {
      const observed = await readStable(path.join(root, ...file.path.split('/')));
      if (observed.identity !== observations.get(file.path) || observed.sha256 !== file.sha256) throw new Error(`Source changed during capture: ${file.path}`);
    }
    if (JSON.stringify(await gitState(root)) !== JSON.stringify(state)) throw new Error('Source enumeration/Git state changed during capture');
    const checkedReport = await readStable(checks);
    if (checkedReport.identity !== report.identity || checkedReport.sha256 !== report.sha256) throw new Error('Checks report changed during capture');
    const manifest = validateManifest({
      version: 1, label, createdAt: new Date().toISOString(), trustModel: 'trusted-quiescent-filesystem',
      source: { head: state.head, branch: state.branch }, status: state.status, files, deletions, exclusions,
      dependencyFiles: files.map(file => file.path).filter(dependency),
      artifacts: { diff: descriptor('tracked.patch', patch), checks: descriptor('checks-report', report.bytes) }, limits: { ...LIMITS },
    });
    const metadata = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
    if (metadata.length > MANIFEST_LIMIT) throw new Error('Manifest size limit exceeded');
    await writeNew(path.join(staging, 'manifest.json'), metadata);
    await verifyCheckpoint(staging);
    // Exclusive mkdir reserves the final label. Unlike directory rename alone,
    // this cannot replace an existing empty directory on POSIX. INCOMPLETE keeps
    // this reserved output unpublishable until every independently checked file
    // has moved into it. Failed output is retained, never recursively cleaned up.
    await safePath(output);
    await fs.mkdir(final);
    await writeNew(path.join(final, 'INCOMPLETE'), Buffer.from('Quarantined until publication completes.\n'));
    for (const name of ['source', 'tracked.patch', 'checks-report', 'manifest.json']) {
      if (name === 'source' && !files.length) continue;
      await safePath(staging);
      await safePath(final);
      await fs.rename(path.join(staging, name), path.join(final, name));
    }
    await safePath(path.join(final, 'INCOMPLETE'));
    await fs.unlink(path.join(final, 'INCOMPLETE'));
    await verifyCheckpoint(final);
    // Only the known empty staging directory is removed; never recursive cleanup.
    await fs.rmdir(staging);
    return { path: final, manifest };
  } catch (error) {
    throw new Error(`${error.message}. Incomplete output is retained at ${staging} and, if reserved, ${final}; inspect manually, do not use incomplete output as a checkpoint.`, { cause: error });
  }
}

export async function previewCheckpoint({ checkpointPath, destination, activeRoot }) {
  const checkpoint = await safePath(checkpointPath);
  const active = await safePath(activeRoot);
  const target = await safePath(destination, { missing: true });
  const previewArea = path.join(active, 'data/checkpoint-previews');
  if (inside(target, active) || (inside(active, target) && !(inside(previewArea, target) && target !== previewArea)) || inside(checkpoint, target) || inside(target, checkpoint)) throw new Error('Destination must be a new separate tree, outside active source except data/checkpoint-previews/<new-dir>');
  try { await fs.lstat(target); throw new Error('Preview destination already exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const manifest = await verifyCheckpoint(checkpoint);
  await ensureDirectory(path.dirname(target));
  await safePath(target, { missing: true });
  await fs.mkdir(target);
  const marker = `.checkpoint-incomplete-${randomUUID()}`;
  try {
    await writeNew(path.join(target, marker), Buffer.from('Quarantined incomplete preview.\n'));
    for (const file of manifest.files) {
      const observed = await readStable(path.join(checkpoint, 'source', ...file.path.split('/')));
      if (observed.size !== file.size || observed.sha256 !== file.sha256) throw new Error(`Checkpoint changed during preview: ${file.path}`);
      await writeNew(path.join(target, ...file.path.split('/')), observed.bytes, file.mode === '100755' ? 0o755 : 0o644);
    }
    await verifyCheckpoint(checkpoint);
    for (const file of manifest.files) {
      const restored = await readStable(path.join(target, ...file.path.split('/')));
      if (restored.size !== file.size || restored.sha256 !== file.sha256) throw new Error(`Preview changed during reconstruction: ${file.path}`);
    }
    await safePath(path.join(target, marker));
    await fs.unlink(path.join(target, marker));
    return { path: target, files: manifest.files.length };
  } catch (error) {
    throw new Error(`${error.message}. Incomplete preview is quarantined at ${target}; inspect manually.`, { cause: error });
  }
}
