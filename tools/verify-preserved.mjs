import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('docs/tasks/task-00-preserved.json', root), 'utf8'));
const failures = [];
for (const [path, expected] of Object.entries(manifest)) {
  const actual = await readFile(new URL(path, root)).then(data => createHash('sha256').update(data).digest('hex')).catch(() => null);
  if (actual !== expected) failures.push(path);
}
for (const [original, copy] of [
  ['aether_dom_codex_kit/cdom.schema.json', 'packages/schema/cdom.schema.json'],
  ['aether_dom_codex_kit/sample.cdom.json', 'packages/schema/fixtures/sample.cdom.json'],
]) {
  if (!(await readFile(new URL(original, root))).equals(await readFile(new URL(copy, root)))) failures.push(copy);
}
if (failures.length) {
  console.error('Preservation check failed:', failures.join(', '));
  process.exitCode = 1;
} else console.log(`${Object.keys(manifest).length} original files preserved; schema and fixture match kit bytes.`);
