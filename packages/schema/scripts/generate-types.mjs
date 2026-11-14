import { readFile, writeFile } from 'node:fs/promises';
import { compile } from 'json-schema-to-typescript';

for (const [source, target, title] of [
  ['cdom.schema.json', 'cdom.generated.ts', 'CdomDocument'],
  ['cdom.v0.2.schema.json', 'cdom-v2.generated.ts', 'CdomDocumentV2'],
  ['cdom.v0.3.schema.json', 'cdom-v3.generated.ts', 'CdomDocumentV3'],
  ['cdom.v0.4.schema.json', 'cdom-v4.generated.ts', 'CdomDocumentV4'],
  ['cdom.v0.5.schema.json', 'cdom-v5.generated.ts', 'CdomDocumentV5'],
  ['rig.schema.json', 'rig.generated.ts', 'Rig'],
  ['asset-provenance.schema.json', 'asset-provenance.generated.ts', 'AssetProvenance'],
  ['svg.schema.json', 'svg.generated.ts', 'SvgAsset'],
  ['command.schema.json', 'command.generated.ts', 'CdomCommand'],
  ['player-manifest.schema.json', 'player-manifest.generated.ts', 'PlayerManifestWire'],
  ['analysis.schema.json', 'analysis.generated.ts', 'DocumentAnalysis'],
  ['proposal.schema.json', 'proposal.generated.ts', 'Proposal'],
  ['proposal-request.schema.json', 'proposal-request.generated.ts', 'ProposalRequest'],
  ['fork-branch.schema.json', 'fork-branch.generated.ts', 'ForkBranchCommand'],
  ['branch-list.schema.json', 'branch-list.generated.ts', 'BranchList'],
  ['branch-diff.schema.json', 'branch-diff.generated.ts', 'ThreeWayDiff'],
  ['fork-result.schema.json', 'fork-result.generated.ts', 'ForkResult'],
  ['job-request.schema.json', 'job-request.generated.ts', 'JobRequest'],
  ['job.schema.json', 'job.generated.ts', 'Job'],
]) {
  const outputUrl = new URL(`../src/${target}`, import.meta.url);
  const schema = JSON.parse(await readFile(new URL(`../${source}`, import.meta.url), 'utf8'));
  const compiled = await compile({ ...schema, title }, title, {
    bannerComment: `/* Generated from ${source}. Run pnpm --filter @aether-dom/schema types:generate. */`,
    style: { singleQuote: true, semi: true },
    ...(source.startsWith('asset-provenance') || source.startsWith('cdom.v0.4') || source.startsWith('cdom.v0.5') || source.startsWith('rig.schema') || source.startsWith('job') || source.startsWith('proposal') || source.startsWith('player-manifest') || source.startsWith('branch-') ? { ignoreMinAndMaxItems: true } : {}),
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
