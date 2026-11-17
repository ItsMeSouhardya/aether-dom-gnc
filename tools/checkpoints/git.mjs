import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { relative, uniquePaths, LIMITS } from './safety.mjs';

const execute = promisify(execFile);
export async function git(root, args, limit = 16 * 1024 * 1024, { literalPathspecs = true } = {}) {
  // Inherited Git redirection/config injection must never select another index,
  // repository, executable diff driver, optional index refresh or global setting.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
  Object.assign(env, { GIT_OPTIONAL_LOCKS: '0', GIT_LITERAL_PATHSPECS: literalPathspecs ? '1' : '0', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_TERMINAL_PROMPT: '0' });
  const result = await execute('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-c', 'core.pager=cat', ...args], { cwd: root, env, encoding: 'buffer', maxBuffer: limit, timeout: 60000, windowsHide: true });
  return result.stdout;
}

const decode = buffer => new TextDecoder('utf-8', { fatal: true }).decode(buffer);
const nul = buffer => {
  const text = decode(buffer);
  if (text && !text.endsWith('\0')) throw new Error('Malformed Git NUL output');
  return text ? text.slice(0, -1).split('\0') : [];
};

export async function gitState(root) {
  const top = decode(await git(root, ['rev-parse', '--show-toplevel'])).trim();
  if (path.resolve(top).toLowerCase() !== path.resolve(root).toLowerCase()) throw new Error('repoRoot must be the repository root');
  const head = decode(await git(root, ['rev-parse', '--verify', 'HEAD'])).trim();
  if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(head)) throw new Error('A committed HEAD/base is required');
  const ref = decode(await git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
  const index = nul(await git(root, ['ls-files', '--stage', '-z'])).map(row => {
    const match = /^(\d{6}) ([a-f0-9]+) (\d)\t([\s\S]+)$/.exec(row);
    if (!match || match[3] !== '0') throw new Error('Unmerged or malformed Git index');
    return { path: relative(match[4]), mode: match[1], blob: match[2] };
  });
  const base = nul(await git(root, ['ls-tree', '-r', '-z', head])).map(row => {
    const match = /^(\d{6}) (blob|commit) ([a-f0-9]+)\t([\s\S]+)$/.exec(row);
    if (!match) throw new Error('Malformed Git base tree');
    return { path: relative(match[4]), mode: match[1], blob: match[3] };
  });
  const untracked = nul(await git(root, ['ls-files', '--others', '--exclude-standard', '-z'])).map(relative);
  const rows = nul(await git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=none']));
  const status = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!/^[ MADRCU?!]{2} /.test(row)) throw new Error('Malformed Git status');
    const item = { path: relative(row.slice(3)), index: row[0], worktree: row[1] };
    if (/[RC]/.test(row.slice(0, 2))) item.originalPath = relative(rows[++i]);
    status.push(item);
  }
  const names = [...new Set([...index.map(x => x.path), ...base.map(x => x.path), ...untracked])].sort();
  if (names.length > LIMITS.files * 4) throw new Error('Source enumeration limit exceeded');
  uniquePaths(names, { allowAncestors: true });
  return { head, branch: ref === 'HEAD' ? null : ref, index, base, untracked, status, names };
}

export async function trackedDiff(root, state, selected) {
  const allowed = new Set(selected);
  const changed = [...new Set(state.status.flatMap(item => [item.path, ...(item.originalPath ? [item.originalPath] : [])]))].filter(name => allowed.has(name)).sort();
  const parts = [];
  let total = 0;
  // Conservative UTF-16 argument budget stays well below Windows' 32K limit.
  // Git literal pathspecs still recurse into descendants. Pair each positive
  // with a glob exclusion of ALL descendants before Git reads any diff bytes.
  // Ancestor/descendant positives must be in different batches: otherwise the
  // ancestor's negative would mask a separately selected child in that batch.
  for (let offset = 0; offset < changed.length;) {
    const batch = [];
    const specs = [];
    let chars = 0;
    while (offset < changed.length && batch.length < 100) {
      const name = changed[offset];
      const positive = `:(top,literal)${name}`;
      const escaped = name.replace(/([*?[\]\\])/g, '\\$1');
      const negative = `:(top,exclude,glob)${escaped}/**`;
      const cost = positive.length + negative.length + 8;
      if (chars + cost >= 12000 || batch.some(other => name.startsWith(other + '/') || other.startsWith(name + '/'))) break;
      chars += cost;
      batch.push(name);
      specs.push(positive, negative);
      offset++;
    }
    if (!batch.length) throw new Error('Diff path argument limit exceeded');
    const bytes = await git(root, ['diff', '--binary', '--full-index', '--no-ext-diff', '--no-textconv', '--no-renames', state.head, '--', ...specs], LIMITS.fileBytes, { literalPathspecs: false });
    total += bytes.length;
    if (total > LIMITS.fileBytes) throw new Error('Tracked diff size limit exceeded');
    parts.push(bytes);
  }
  return Buffer.concat(parts, total);
}
