import { promises as fs, constants } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const LIMITS = Object.freeze({ files: 10000, fileBytes: 64 * 1024 * 1024, totalBytes: 512 * 1024 * 1024 });
export const MANIFEST_LIMIT = 8 * 1024 * 1024;
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reserved = /^(?:con|prn|aux|nul|clock\$|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i;

export function component(value) {
  if (typeof value !== 'string' || !value || value === '.' || value === '..' || /[\x00-\x1f\x7f<>:"/\\|?*]/u.test(value) || /[. ]$/u.test(value) || reserved.test(value) || Buffer.byteLength(value) > 255 || value !== value.normalize('NFC') || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)) throw new Error(`Unsafe path component: ${JSON.stringify(value)}`);
  return value;
}

export function relative(value) {
  if (typeof value !== 'string' || !value || value.length > 2048 || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) throw new Error('Unsafe relative path');
  value.split('/').forEach(component);
  return value;
}

export function slug(value) {
  component(value);
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(value)) throw new Error('Label must be a lowercase slug of 1–80 characters');
  return value;
}

export function exclusion(name) {
  const parts = name.split('/');
  const lower = parts.map(p => p.toLowerCase());
  if (lower.some(p => ['.git', 'node_modules', '.next', 'dist', 'build', 'coverage', '__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache', '.cache', '.turbo', '.parcel-cache', 'playwright-report', 'test-results', '.superpowers', '.aws', '.ssh', '.gnupg'].includes(p) || p === '.venv' || p.startsWith('.venv-'))) return 'dependency/cache/internal';
  if (lower[0] === 'data' || (lower[0] === 'assets' && ['imported', 'originals', 'evidence'].includes(lower[1])) || (lower[0] === '.impeccable' && lower[1] === 'review')) return 'runtime/scratch';
  const base = lower.at(-1);
  if ((/^\.env(?:\.|$)/.test(base) && base !== '.env.example') || /^\.envrc(?:\.|$)/.test(base) || /\.(?:pem|key|p12|pfx|jks|keystore)$/i.test(base) || /^(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)(?:\.|$)/i.test(base) || ['.npmrc', '.pypirc', '.netrc', '.git-credentials', 'auth.json', 'credentials', 'secrets'].includes(base) || /^(?:credentials?|secrets?)(?:[.-].*)?\.(?:json|ya?ml|toml|ini|txt|env)$/i.test(base)) return 'secret/credential';
  if (/\.(?:py[co]|tsbuildinfo|sqlite3?|db)(?:-(?:wal|shm|journal))?$/i.test(base)) return 'runtime/cache';
  return null;
}

export function uniquePaths(names, { allowAncestors = false } = {}) {
  const seen = new Map();
  for (const name of names) {
    relative(name);
    const pieces = name.split('/');
    for (let i = 1; i <= pieces.length; i++) {
      const prefix = pieces.slice(0, i).join('/');
      const key = prefix.toLowerCase();
      if (seen.has(key) && seen.get(key) !== prefix) throw new Error(`Case-colliding paths: ${prefix}`);
      seen.set(key, prefix);
    }
  }
  const set = new Set(names);
  if (set.size !== names.length) throw new Error('Duplicate file paths');
  for (const name of allowAncestors ? [] : names) {
    const pieces = name.split('/');
    for (let i = 1; i < pieces.length; i++) if (set.has(pieces.slice(0, i).join('/'))) throw new Error('File/directory path collision');
  }
}

export const inside = (root, candidate) => {
  const rel = path.relative(root, candidate);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
};

// V1 checks visible redirects. These path checks do not hold native directory
// capabilities against a hostile process concurrently replacing ancestors.
export async function safePath(name, { missing = false } = {}) {
  if (typeof name !== 'string' || /^(?:\\\\|\/\/)/.test(name) || /^[a-z]:(?![\\/])/i.test(name)) throw new Error('Unsafe network or drive-relative path');
  const absolute = path.resolve(name);
  const root = path.parse(absolute).root;
  let cursor = root;
  const parts = absolute.slice(root.length).split(path.sep).filter(Boolean);
  parts.forEach(component);
  const rejectAlias = async existing => {
    const canonical = await fs.realpath(existing);
    const normalize = value => process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
    if (normalize(canonical) !== normalize(existing)) throw new Error(`Redirect/alias refused: ${existing}`);
  };
  for (let i = 0; i < parts.length; i++) {
    cursor = path.join(cursor, parts[i]);
    let stat;
    try { stat = await fs.lstat(cursor); } catch (error) {
      if (error.code === 'ENOENT' && missing) { await rejectAlias(path.dirname(cursor)); return absolute; }
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error(`Redirect/symbolic link refused: ${cursor}`);
    if (i < parts.length - 1 && !stat.isDirectory()) throw Object.assign(new Error(`Non-directory ancestor: ${cursor}`), { code: 'ENOTDIR' });
  }
  await rejectAlias(absolute);
  return absolute;
}

export async function ensureDirectory(name) {
  const absolute = await safePath(name, { missing: true });
  const parent = path.dirname(absolute);
  if (parent !== absolute) {
    try {
      const st = await fs.lstat(absolute);
      if (!st.isDirectory() || st.isSymbolicLink()) throw new Error('Redirect/non-directory output refused');
      return absolute;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await ensureDirectory(parent);
  }
  try { await fs.mkdir(absolute); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  await safePath(absolute);
  if (!(await fs.lstat(absolute)).isDirectory()) throw new Error('Output parent is not a directory');
  return absolute;
}

const identity = st => [st.dev, st.ino, st.size, st.mtimeMs, st.ctimeMs, st.mode, st.nlink].join(':');
export async function inspectFile(name, limit = LIMITS.fileBytes) {
  await safePath(name);
  const before = await fs.lstat(name);
  if (before.isDirectory()) throw Object.assign(new Error(`Not a regular file: ${name}`), { code: 'EISDIR' });
  if (!before.isFile() || before.nlink !== 1) throw new Error(`Only standalone regular files allowed (no hard links): ${name}`);
  if (before.size > limit) throw new Error(`File size limit exceeded: ${name}`);
  return before;
}
export async function readStable(name, limit = LIMITS.fileBytes) {
  const before = await inspectFile(name, limit);
  const handle = await fs.open(name, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    if (identity(await handle.stat()) !== identity(before)) throw new Error(`File changed before read: ${name}`);
    const bytes = Buffer.alloc(before.size + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const read = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (!read.bytesRead) break;
      offset += read.bytesRead;
    }
    const after = await handle.stat();
    await safePath(name);
    if (offset !== before.size || identity(after) !== identity(before) || identity(await fs.lstat(name)) !== identity(before)) throw new Error(`File changed during read: ${name}`);
    return { bytes: bytes.subarray(0, offset), sha256: hash(bytes.subarray(0, offset)), size: offset, mode: before.mode & 0o111 ? '100755' : '100644', identity: identity(before) };
  } finally { await handle.close(); }
}

export async function writeNew(name, bytes, mode = 0o644) {
  await ensureDirectory(path.dirname(name));
  await safePath(name, { missing: true });
  const handle = await fs.open(name, 'wx', mode);
  try { await handle.writeFile(bytes); } finally { await handle.close(); }
}

export async function scanTree(root, maxFiles = LIMITS.files + 3) {
  await safePath(root);
  if (!(await fs.lstat(root)).isDirectory()) throw new Error('Checkpoint root is not a directory');
  const files = [];
  let directories = 0;
  async function walk(dir, prefix = '') {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      component(entry.name);
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      const st = await fs.lstat(full);
      if (st.isSymbolicLink()) throw new Error(`Redirect refused: ${name}`);
      if (st.isDirectory()) {
        if (++directories > LIMITS.files * 32) throw new Error('Directory limit exceeded');
        await walk(full, name);
      } else if (st.isFile() && st.nlink === 1) {
        if (files.push(name) > maxFiles) throw new Error('File count limit exceeded');
      } else throw new Error(`Non-regular file or hard link: ${name}`);
    }
  }
  await walk(root);
  uniquePaths(files);
  return files.sort();
}
