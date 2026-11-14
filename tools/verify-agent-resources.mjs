import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function contained(base, relative) {
  if (typeof relative !== 'string') throw new Error('Missing relative archive path');
  const result = resolve(base, relative);
  if (!result.startsWith(base + sep)) throw new Error('Archive path escapes its root');
  return result;
}
const catalog = JSON.parse(await readFile(resolve(root, 'agent_resources/catalog.json'), 'utf8'));
let totalFiles = 0, totalSkills = 0;
for (const plugin of catalog.plugins) {
  const directory = contained(root, plugin.root);
  const manifest = JSON.parse(await readFile(contained(root, plugin.manifest), 'utf8'));
  if (manifest.version !== plugin.version) failures.push(`${plugin.name}: version mismatch`);
  const paths = new Set();
  for (const entry of manifest.files) {
    if (paths.has(entry.path)) failures.push(`${plugin.name}: duplicate ${entry.path}`);
    paths.add(entry.path);
    try {
      const bytes = await readFile(contained(directory, entry.path));
      if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256) {
        failures.push(`${plugin.name}: ${entry.path} differs from its snapshot`);
      }
    } catch (error) { failures.push(`${plugin.name}: ${entry.path}: ${error.message}`); }
    totalFiles++;
  }
  if (plugin.skillCount !== plugin.skills.length) failures.push(`${plugin.name}: skill count mismatch`);
  for (const skill of [...plugin.skills, ...(plugin.auxiliarySkills ?? [])]) {
    const absolute = contained(root, skill.path);
    const relative = absolute.slice(directory.length + 1).replaceAll('\\', '/');
    if (!paths.has(relative)) failures.push(`${plugin.name}: skill not in manifest: ${skill.name}`);
    const text = await readFile(absolute, 'utf8').catch(() => '');
    const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!front || front[1].match(/^name:\s*(.+)$/m)?.[1].trim() !== skill.name) {
      failures.push(`${plugin.name}: missing or mismatched skill ${skill.name}`);
    }
    totalSkills++;
  }
  const license = await readFile(resolve(directory, 'LICENSE'), 'utf8').catch(() => '');
  if (!license.trim()) failures.push(`${plugin.name}: missing license`);
  console.log(`${plugin.name} ${plugin.version}: ${manifest.files.length} snapshot files; ${plugin.skills.length} plugin skills; ${(plugin.auxiliarySkills ?? []).length} variants`);
}
const environment = resolve(root, 'agent_resources/environment');
const provenance = JSON.parse(await readFile(resolve(environment, 'provenance.json'), 'utf8'));
if (hash(await readFile(resolve(environment, 'RTK.md'))) !== provenance.sha256) {
  failures.push('RTK environment reference differs from its recorded source');
}
if (failures.length) {
  failures.forEach(failure => console.error(failure));
  process.exitCode = 1;
} else console.log(`Verified ${totalFiles} snapshot files, ${totalSkills} skill entries/variants and RTK provenance.`);
