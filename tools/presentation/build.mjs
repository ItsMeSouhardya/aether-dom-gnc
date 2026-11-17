import path from 'node:path';
import { promises as fs } from 'node:fs';
import { hash, readStable, scanTree, ensureDirectory } from '../checkpoints/safety.mjs';
import { run } from './runtime.mjs';

export async function behaviorDigest(root) {
  const names = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tools/presentation.mjs', 'tools/checkpoints/safety.mjs'];
  for (const directory of ['apps/api/app', 'apps/api/migrations', 'apps/web/src', 'packages/schema/src', 'packages/schema/fixtures', 'landing-page', 'assets/fixtures', 'tools/presentation']) {
    for (const name of await scanTree(path.join(root, directory))) {
      if (/(^|\/)(?:__pycache__|dist)\//.test(name) || /\.(?:pyc|md)$/i.test(name)) continue;
      names.push(`${directory}/${name}`);
    }
  }
  for (const directory of ['apps/web', 'apps/api', 'packages/schema']) {
    for (const entry of await fs.readdir(path.join(root, directory), { withFileTypes: true })) {
      if (entry.isFile() && /(?:package\.json|.*\.schema\.json|next\.config\..*|postcss\.config\..*|tsconfig\.json|pyproject\.toml|requirements.*\.txt|alembic\.ini)$/.test(entry.name)) names.push(`${directory}/${entry.name}`);
    }
  }
  const sources = {};
  for (const name of names.sort()) sources[name] = (await readStable(path.join(root, name))).sha256;
  return { digest: hash(JSON.stringify(sources)), sources };
}

export async function build(config) {
  await run(process.execPath, [config.next, 'build'], { cwd: path.join(config.root, 'apps/web'), env: { ...config.env, NEXT_TELEMETRY_DISABLED: '1' }, timeout: 300000, stdio: 'inherit' });
  const provenance = { version: 1, buildId: (await readStable(path.join(config.root, 'apps/web/.next/BUILD_ID'))).bytes.toString().trim(), ...await behaviorDigest(config.root) };
  const destination = path.join(config.root, 'data/presentation/build.json');
  await ensureDirectory(path.dirname(destination));
  // Build provenance is mutable preparation metadata; workspace/backups are never replaced.
  await fs.writeFile(destination, JSON.stringify(provenance, null, 2));
  return provenance;
}

export async function verifyBuild(root) {
  const file = path.join(root, 'data/presentation/build.json');
  let saved;
  try { saved = JSON.parse((await readStable(file)).bytes); } catch { throw new Error('Prepared build provenance missing; run node tools/presentation.mjs build'); }
  const buildId = (await readStable(path.join(root, 'apps/web/.next/BUILD_ID'))).bytes.toString().trim();
  if (saved.version !== 1 || saved.buildId !== buildId || saved.digest !== (await behaviorDigest(root)).digest) throw new Error('Production build stale; run node tools/presentation.mjs build');
  return saved;
}
