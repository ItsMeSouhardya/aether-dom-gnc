import path from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { safePath, ensureDirectory, writeNew, readStable, scanTree, slug, hash, relative, uniquePaths } from '../checkpoints/safety.mjs';
import { workspacePaths, pythonOperation, preflight } from './runtime.mjs';

export async function freshDirectory(directory) {
  await safePath(directory, { missing: true });
  await ensureDirectory(path.dirname(directory));
  await fs.mkdir(directory); // Exclusive creation, including empty preexisting roots.
  return directory;
}

export async function workspaceManifest(ws) {
  await safePath(ws.root);
  const manifest = JSON.parse((await readStable(ws.manifest)).bytes);
  if (manifest.version !== 1 || manifest.workspace !== ws.id || typeof manifest.instance !== 'string' ||
      manifest.database !== 'workspace.sqlite3' || manifest.assets !== 'assets' ||
      manifest.prepared !== true || ![manifest.projectId, manifest.branchId].every(id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id))) throw new Error('Invalid prepared workspace identity (fixed paths required)');
  return manifest;
}

export async function setup(config, id, reviewedJob = false) {
  const ws = workspacePaths(config.root, id);
  await preflight(config);
  await freshDirectory(ws.root);
  const prepared = await pythonOperation(config, ws, 'setup', reviewedJob ? ['--with-reviewed-job'] : []);
  const manifest = { version: 1, workspace: id, instance: randomUUID(), database: 'workspace.sqlite3', assets: 'assets', prepared: true, ...prepared };
  await writeNew(ws.manifest, JSON.stringify(manifest, null, 2));
  return { workspace: id, path: ws.root, revision: manifest.initialRevision };
}

export async function verifyWorkspace(config, id) {
  const ws = workspacePaths(config.root, id), manifest = await workspaceManifest(ws);
  const current = await pythonOperation(config, ws, 'inspect');
  return { workspace: id, initialRevision: manifest.initialRevision, current };
}

async function hashTree(directory) {
  const names = await scanTree(directory);
  const files = {};
  for (const name of names) {
    const entry = await readStable(path.join(directory, name));
    files[name] = { sha256: entry.sha256, size: entry.size };
  }
  return files;
}

export async function backupWorkspace(config, id, label) {
  slug(label);
  const ws = workspacePaths(config.root, id), manifest = await workspaceManifest(ws);
  const final = path.join(config.root, 'data/presentation/backups', label);
  await safePath(final, { missing: true });
  try { await fs.lstat(final); throw new Error('Backup label already exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const staging = `${final}.incomplete-${randomUUID()}`;
  await freshDirectory(staging);
  const inspection = await pythonOperation(config, ws, 'backup', ['--destination', staging]);
  await writeNew(path.join(staging, 'workspace.json'), JSON.stringify(manifest, null, 2));
  const files = await hashTree(staging);
  await writeNew(path.join(staging, 'backup.json'), JSON.stringify({ version: 1, label, workspace: id, files, inspection,
    externalWriters: 'Operator must stop all manual/noncooperating writers. Gate excludes cooperating lifetime owners only.' }, null, 2));
  await fs.rename(staging, final);
  return { backup: label, path: final, files: Object.keys(files).length };
}

export async function verifyBackup(config, label) {
  slug(label);
  const directory = path.join(config.root, 'data/presentation/backups', label);
  const saved = JSON.parse((await readStable(path.join(directory, 'backup.json'))).bytes);
  if (saved.version !== 1 || saved.label !== label || !saved.files || typeof saved.files !== 'object') throw new Error('Invalid backup manifest');
  const names = Object.keys(saved.files);
  uniquePaths(names);
  if (names.length > 10000 || !names.includes('workspace.sqlite3') || !names.includes('workspace.json')) throw new Error('Invalid backup coverage');
  for (const name of names) {
    relative(name);
    if (name !== 'workspace.sqlite3' && name !== 'workspace.json' && !name.startsWith('assets/')) throw new Error('Unexpected backup payload');
    const entry = await readStable(path.join(directory, name));
    if (saved.files[name].sha256 !== entry.sha256 || saved.files[name].size !== entry.size) throw new Error(`Backup hash mismatch: ${name}`);
  }
  const actual = (await scanTree(directory)).filter(name => name !== 'backup.json');
  if (JSON.stringify(actual) !== JSON.stringify(names.sort())) throw new Error('Unexpected backup files');
  return { directory, saved };
}

export async function restoreWorkspace(config, label, id) {
  const { directory, saved } = await verifyBackup(config, label);
  const ws = workspacePaths(config.root, id);
  await freshDirectory(ws.root);
  const old = JSON.parse((await readStable(path.join(directory, 'workspace.json'))).bytes);
  const current = await pythonOperation(config, ws, 'restore', ['--destination', directory]);
  if (hash(JSON.stringify(current)) !== hash(JSON.stringify(saved.inspection))) throw new Error('Restored integrity/reference coverage mismatch');
  await writeNew(ws.manifest, JSON.stringify({ ...old, workspace: id, instance: randomUUID(), restoredFrom: label }, null, 2));
  return { workspace: id, restoredFrom: label, current };
}
