import { readFile, writeFile } from 'node:fs/promises';
import { compile } from 'json-schema-to-typescript';

for (const [source, target, title] of [
  ['cdom.schema.json', 'cdom.generated.ts', 'CdomDocument'],
  ['command.schema.json', 'command.generated.ts', 'CdomCommand'],
]) {
  const outputUrl = new URL(`../src/${target}`, import.meta.url);
  const schema = JSON.parse(await readFile(new URL(`../${source}`, import.meta.url), 'utf8'));
  const output = await compile({ ...schema, title }, title, {
    bannerComment: `/* Generated from ${source}. Run pnpm --filter @aether-dom/schema types:generate. */`,
    style: { singleQuote: true, semi: true },
  });
  if (process.argv.includes('--check')) {
    const existing = await readFile(outputUrl, 'utf8').catch(() => '');
    if (existing !== output) {
      console.error(`${target} is stale. Run pnpm --filter @aether-dom/schema types:generate.`);
      process.exitCode = 1;
    } else console.log(`${target} matches ${source}.`);
  } else {
    await writeFile(outputUrl, output);
    console.log(`Generated src/${target}`);
  }
}
