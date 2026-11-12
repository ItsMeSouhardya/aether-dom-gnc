import { readFile, writeFile } from 'node:fs/promises';
import { compile } from 'json-schema-to-typescript';

for (const [source, target, title] of [
  ['cdom.schema.json', 'cdom.generated.ts', 'CdomDocument'],
  ['cdom.v0.2.schema.json', 'cdom-v2.generated.ts', 'CdomDocumentV2'],
  ['cdom.v0.3.schema.json', 'cdom-v3.generated.ts', 'CdomDocumentV3'],
  ['svg.schema.json', 'svg.generated.ts', 'SvgAsset'],
  ['command.schema.json', 'command.generated.ts', 'CdomCommand'],
  ['analysis.schema.json', 'analysis.generated.ts', 'DocumentAnalysis'],
  ['proposal.schema.json', 'proposal.generated.ts', 'Proposal'],
  ['proposal-request.schema.json', 'proposal-request.generated.ts', 'ProposalRequest'],
]) {
  const outputUrl = new URL(`../src/${target}`, import.meta.url);
  const schema = JSON.parse(await readFile(new URL(`../${source}`, import.meta.url), 'utf8'));
  const compiled = await compile({ ...schema, title }, title, {
    bannerComment: `/* Generated from ${source}. Run pnpm --filter @aether-dom/schema types:generate. */`,
    style: { singleQuote: true, semi: true },
    ...(source.startsWith('proposal') ? { ignoreMinAndMaxItems: true } : {}),
  });
  // The generator's `{}` means any non-nullish value in TypeScript, whereas
  // approveProposal requires an object with no keys. Keep this correction local
  // to the command artifact so preserved document types remain byte-identical.
  const output = source === 'command.schema.json'
    ? compiled.replace(/(op: 'approveProposal';\s+targetId: string;\s+args:) \{\};/u, '$1 Record<string, never>;')
    : compiled;
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
