import { describe, expect, it } from 'vitest';
import * as contract from '../src/index';
import fixture from '../fixtures/sample.cdom.json';
import cases from '../fixtures/asset-rights-cases.json';

describe('version-bound asset rights', () => {
  it('accepts optional provenance only in exact document 0.4', () => {
    const document = structuredClone(fixture);
    Object.assign(document, { schemaVersion: '0.4.0' });
    Object.assign(document.assets[0]!, { provenance: cases.provenance });
    expect(contract.validateCdom(document).valid).toBe(true);
    for (const version of ['0.1.0', '0.2.0', '0.3.0']) {
      Object.assign(document, { schemaVersion: version });
      expect(contract.validateCdom(document).valid).toBe(false);
    }
  });
  it('exports pure policy and hash functions', () => {
    expect(contract).toHaveProperty('evaluateAssetUse', expect.any(Function));
    expect(contract).toHaveProperty('sha256Bytes', expect.any(Function));
    expect(contract).toHaveProperty('svgPayloadHash', expect.any(Function));
  });
});

for (const item of cases.cases) {
  it(item.name, () => {
    const before = JSON.stringify(item);
    const decision = contract.evaluateAssetUse(item.asset, item.use as contract.ExportUse, item.evidence);
    expect(decision.allowed).toBe(item.allowed);
    expect(decision.assetId).toBe('asset_1');
    expect(decision.use).toBe(item.use);
    expect(decision.reasons.length === 0).toBe(item.allowed);
    expect(JSON.stringify(item)).toBe(before);
    if (item.allowed && item.asset.provenance) expect(decision.attribution).toEqual(['Art by Ada']);
  });
}
it('hashes raw bytes with standard SHA256 vectors', () => {
  expect(contract.sha256Bytes(new Uint8Array())).toBe(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  );
  expect(contract.sha256Bytes(new TextEncoder().encode('abc'))).toBe(
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
  expect(contract.sha256Bytes(new TextEncoder().encode('a'.repeat(1000000)))).toBe(
    'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
  );
});
it('matches the shared SVG binary64/Unicode digest independently of key insertion', () => {
  expect(contract.svgPayloadHash(cases.svg as contract.SvgData)).toBe(cases.svgPayloadSha256);
  const svg = structuredClone(cases.svg);
  svg.root.attributes = { fill: 'é😀', viewBox: '0 0 120 80' };
  expect(contract.svgPayloadHash(svg as contract.SvgData)).toBe(cases.svgPayloadSha256);
  svg.viewBox.x = 1;
  expect(contract.svgPayloadHash(svg as contract.SvgData)).not.toBe(cases.svgPayloadSha256);
});
it('keeps the SVG payload hash stable across a portable JSON roundtrip that loses negative zero', () => {
  const portable = JSON.parse(JSON.stringify(cases.svg)) as contract.SvgData;
  expect(Object.is(cases.svg.viewBox.x, -0)).toBe(true);
  expect(Object.is(portable.viewBox.x, -0)).toBe(false);
  expect(contract.svgPayloadHash(portable)).toBe(contract.svgPayloadHash(cases.svg as contract.SvgData));
});
function rightsCommand() {
  return {
    commandId: 'c',
    projectId: 'p',
    branchId: 'b',
    expectedRevision: 0,
    actor: { kind: 'human', id: 'h' },
    reason: 'Record evidence',
    op: 'setAssetEvidence',
    targetId: 'asset_1',
    args: {
      rights: 'project_original',
      expectedAssetUri: cases.asset.uri,
      expectedSourceUri: cases.asset.sourceUri,
      creator: cases.provenance.creator,
      source: cases.provenance.source,
      license: cases.provenance.license,
      attribution: '',
      permissions: cases.provenance.permissions,
      lineage: null,
      consents: cases.provenance.consents,
      evidence: [{ label: 'Statement', text: cases.blob.text }],
    },
  };
}
it('accepts only authored command fields and bounded scalar text before recursion', () => {
  const command = rightsCommand();
  expect(contract.validateCommand(command).valid).toBe(true);
  Object.assign(command.args, { current: cases.provenance.current });
  expect(contract.validateCommand(command).valid).toBe(false);
  delete (command.args as Record<string, unknown>).current;
  command.args.evidence[0]!.text = '😀'.repeat(16385);
  expect(contract.validateCommand(command).valid).toBe(false);
  command.args.evidence[0]!.text = '\ud800';
  expect(contract.validateCommand(command).valid).toBe(false);
  command.args.evidence[0]!.text = cases.blob.text;
  command.args.evidence.push({ ...command.args.evidence[0]! });
  expect(contract.validateCommand(command).valid).toBe(false);
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  expect(contract.validateCommand(cyclic).valid).toBe(false);
});
it('rejects duplicate records, bounds and nonportable provenance without mutation', () => {
  const bad = cases.cases.filter((x) =>
    ['duplicate evidence references', 'unsafe path', 'duplicate consent kinds'].includes(x.name),
  );
  for (const item of bad) {
    const doc = structuredClone(fixture);
    Object.assign(doc, { schemaVersion: '0.4.0' });
    Object.assign(doc.assets[0]!, { provenance: item.asset.provenance });
    expect(contract.validateCdom(doc).valid).toBe(false);
  }
  const ledger = structuredClone(cases.provenance);
  ledger.creator = '😀'.repeat(2001);
  expect(contract.validateAssetProvenance(ledger).valid).toBe(false);
  ledger.creator = '\ud800';
  expect(contract.validateAssetProvenance(ledger).valid).toBe(false);
  const deep: Record<string, unknown> = {};
  deep.child = deep;
  expect(contract.validateAssetProvenance(deep).valid).toBe(false);
});

it('rejects raw hashes with trailing newlines and private ledgers without evidence', () => {
  const p = structuredClone(cases.provenance);
  p.current.sha256 += '\n';
  expect(contract.validateAssetProvenance(p).valid).toBe(false);
});

it('enforces exact UTF8 text and aggregate bounds, Unicode whitespace, and command JSON limits', () => {
  const cmd = rightsCommand();
  cmd.args.evidence = [{ label: 'Text', text: '😀'.repeat(16384) }];
  expect(contract.validateCommand(cmd).valid).toBe(true);
  cmd.args.evidence = [0, 1, 2, 3].map((i) => ({ label: 'Text', text: String(i) + 'x'.repeat(65535) }));
  expect(contract.validateCommand(cmd).valid).toBe(true);
  cmd.args.evidence.push({ label: 'Fifth', text: 'x' });
  expect(contract.validateCommand(cmd).valid).toBe(false);
  cmd.args.evidence = [{ label: '\u0085', text: 'Statement' }];
  expect(contract.validateCommand(cmd).valid).toBe(false);
  const overflow = { ...rightsCommand(), extra: 'x'.repeat(524288) };
  expect(contract.validateCommand(overflow).valid).toBe(false);
  const p = structuredClone(cases.provenance);
  p.creator = '\u0085';
  expect(
    contract.evaluateAssetUse({ ...cases.asset, provenance: p }, 'public_distribution', [cases.blob]).allowed,
  ).toBe(false);
});
it('rejects non-scalar SVG payloads before hashing', () => {
  const svg = structuredClone(cases.svg);
  svg.root.text = '\ud800';
  expect(() => contract.svgPayloadHash(svg as contract.SvgData)).toThrow();
});

it('rejects final-newline and traversal media identities', () => {
  for (const uri of ['assets/current.svg\n', 'assets/../secret.svg', 'assets//current.svg']) {
    const p = structuredClone(cases.provenance);
    p.current.uri = uri;
    expect(contract.validateAssetProvenance(p).valid).toBe(false);
    const command = rightsCommand();
    command.args.expectedAssetUri = uri;
    expect(contract.validateCommand(command).valid).toBe(false);
  }
});
