import { readFile, writeFile } from 'node:fs/promises';
import { compile } from 'json-schema-to-typescript';

const schemaUrl = new URL('../cdom.schema.json', import.meta.url);
const outputUrl = new URL('../src/cdom.generated.ts', import.meta.url);
const schema = JSON.parse(await readFile(schemaUrl, 'utf8'));
const output = await compile({ ...schema, title: 'CdomDocument' }, 'CdomDocument', {
  bannerComment: '/* Generated from cdom.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */',
  style: { singleQuote: true, semi: true },
});

if (process.argv.includes('--check')) {
  const existing = await readFile(outputUrl, 'utf8').catch(() => '');
  if (existing !== output) {
    console.error('Generated CDOM types are stale. Run pnpm --filter @aether-dom/schema types:generate.');
    process.exitCode = 1;
  } else console.log('Generated CDOM types match the canonical schema.');
} else {
  await writeFile(outputUrl, output);
  console.log('Generated src/cdom.generated.ts');
}
