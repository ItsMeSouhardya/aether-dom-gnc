import path from 'node:path';
import { LIMITS, MANIFEST_LIMIT, relative, slug, exclusion, uniquePaths, readStable, scanTree, hash } from './safety.mjs';

const object = value => value && typeof value === 'object' && !Array.isArray(value);
function keys(value, required, optional = []) {
  if (!object(value) || required.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) throw new Error('Malformed checkpoint metadata fields');
}
const integer = (value, maximum) => Number.isSafeInteger(value) && value >= 0 && value <= maximum;
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const list = (value, max = LIMITS.files * 4) => { if (!Array.isArray(value) || value.length > max) throw new Error('Manifest list limit/type invalid'); };
const selectedPath = name => { relative(name); if (exclusion(name)) throw new Error(`Excluded path in source payload: ${name}`); };

export function validateManifest(manifest) {
  keys(manifest, ['version', 'label', 'createdAt', 'trustModel', 'source', 'status', 'files', 'deletions', 'exclusions', 'dependencyFiles', 'artifacts', 'limits']);
  if (manifest.version !== 1 || manifest.trustModel !== 'trusted-quiescent-filesystem') throw new Error('Unsupported checkpoint format/trust model');
  slug(manifest.label);
  if (typeof manifest.createdAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(manifest.createdAt) || !Number.isFinite(Date.parse(manifest.createdAt))) throw new Error('Invalid capture date');
  keys(manifest.source, ['head', 'branch']);
  if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(manifest.source.head) || !(manifest.source.branch === null || (typeof manifest.source.branch === 'string' && manifest.source.branch.length > 0 && manifest.source.branch.length <= 1024 && !/[\x00-\x20\x7f]/.test(manifest.source.branch)))) throw new Error('Invalid source provenance');
  keys(manifest.limits, Object.keys(LIMITS));
  for (const key of Object.keys(LIMITS)) if (manifest.limits[key] !== LIMITS[key]) throw new Error('Invalid declared limits');
  list(manifest.files, LIMITS.files);
  let total = 0;
  for (const file of manifest.files) {
    keys(file, ['path', 'sha256', 'size', 'mode', 'tracked']);
    selectedPath(file.path);
    if (!sha(file.sha256) || !integer(file.size, LIMITS.fileBytes) || !['100644', '100755'].includes(file.mode) || typeof file.tracked !== 'boolean') throw new Error('Invalid payload hash/size/mode/status');
    total += file.size;
  }
  uniquePaths(manifest.files.map(file => file.path));
  list(manifest.deletions);
  manifest.deletions.forEach(selectedPath);
  uniquePaths([...manifest.files.map(file => file.path), ...manifest.deletions], { allowAncestors: true });
  list(manifest.status);
  for (const item of manifest.status) {
    keys(item, ['path', 'index', 'worktree'], ['originalPath']);
    relative(item.path);
    if (typeof item.index !== 'string' || typeof item.worktree !== 'string' || !/^[ MADRCU?!]$/.test(item.index) || !/^[ MADRCU?!]$/.test(item.worktree)) throw new Error('Invalid Git status');
    if (Object.hasOwn(item, 'originalPath')) relative(item.originalPath);
  }
  uniquePaths(manifest.status.map(item => item.path), { allowAncestors: true });
  list(manifest.exclusions);
  for (const item of manifest.exclusions) {
    keys(item, ['path', 'reason', 'tracked']);
    relative(item.path);
    if (!exclusion(item.path) || exclusion(item.path) !== item.reason || typeof item.tracked !== 'boolean') throw new Error('Invalid exclusion report');
  }
  uniquePaths(manifest.exclusions.map(item => item.path), { allowAncestors: true });
  list(manifest.dependencyFiles, LIMITS.files);
  uniquePaths(manifest.dependencyFiles);
  for (const name of manifest.dependencyFiles) if (!manifest.files.some(file => file.path === name)) throw new Error('Missing dependency metadata payload');
  keys(manifest.artifacts, ['diff', 'checks']);
  for (const [key, expected] of [['diff', 'tracked.patch'], ['checks', 'checks-report']]) {
    const artifact = manifest.artifacts[key];
    keys(artifact, ['path', 'sha256', 'size']);
    if (artifact.path !== expected || !sha(artifact.sha256) || !integer(artifact.size, LIMITS.fileBytes)) throw new Error('Invalid artifact descriptor');
    total += artifact.size;
  }
  if (total > LIMITS.totalBytes) throw new Error('Checkpoint total size limit exceeded');
  return manifest;
}

export async function verifyCheckpoint(checkpointPath) {
  const root = path.resolve(checkpointPath);
  const manifestFile = await readStable(path.join(root, 'manifest.json'), MANIFEST_LIMIT);
  let manifest;
  try { manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestFile.bytes)); }
  catch { throw new Error('Invalid checkpoint manifest JSON'); }
  validateManifest(manifest);
  const expected = ['manifest.json', ...Object.values(manifest.artifacts).map(file => file.path), ...manifest.files.map(file => `source/${file.path}`)].sort();
  const names = await scanTree(root);
  if (JSON.stringify(names) !== JSON.stringify(expected)) throw new Error('Checkpoint is incomplete, contains unlisted files or missing payload');
  const records = [...manifest.files.map(file => ({ ...file, path: `source/${file.path}` })), ...Object.values(manifest.artifacts)];
  for (const file of records) {
    const observed = await readStable(path.join(root, ...file.path.split('/')));
    if (observed.size !== file.size || observed.sha256 !== file.sha256) throw new Error(`Checkpoint integrity mismatch: ${file.path}`);
    // Modes are metadata for reconstruction; Windows has no POSIX execute bit.
    if (process.platform !== 'win32' && file.mode && observed.mode !== file.mode) throw new Error(`Checkpoint mode mismatch: ${file.path}`);
  }
  const again = await readStable(path.join(root, 'manifest.json'), MANIFEST_LIMIT);
  if (hash(again.bytes) !== manifestFile.sha256 || JSON.stringify(await scanTree(root)) !== JSON.stringify(names)) throw new Error('Checkpoint changed during verification');
  return manifest;
}
