import { describe, expect, it } from 'vitest';
import fixture from '../../../packages/schema/fixtures/asset-rights-cases.json';
import { inspectedAssetDecisions } from '../src/features/assets/inspected-use';

const asset = { ...fixture.asset, provenance: fixture.provenance };
const ledger = { projectId: 'p', branchId: 'b', assetId: asset.id, revision: 1, original: fixture.provenance.original, current: fixture.provenance.current, evidence: [fixture.blob], error: null };
describe('revision-bound inspected decisions', () => {
  it('preserves legacy private allowance and recorded denials', () => {
    expect(inspectedAssetDecisions(fixture.asset, { ...ledger, evidence: [] })[0].allowed).toBe(true);
    const denied = structuredClone(asset); denied.provenance.permissions.private_preview = 'denied';
    expect(inspectedAssetDecisions(denied, ledger)[0].allowed).toBe(false);
  });
  it('fails closed for missing proofs, required consent and actual media mismatch', () => {
    expect(inspectedAssetDecisions(asset, { ...ledger, evidence: [] })[1].allowed).toBe(false);
    const missing = structuredClone(asset); missing.provenance.consents[0] = { kind: 'voice', applicability: 'required', subject: '', status: 'unknown', uses: [], evidenceHashes: [] };
    expect(inspectedAssetDecisions(missing, ledger)[1].allowed).toBe(false);
    for (const bad of [ { ...ledger, error: 'Inspection failed' }, { ...ledger, original: { ...ledger.original, sha256: '0'.repeat(64) } }, { ...ledger, current: { ...ledger.current, sha256: '0'.repeat(64) } }, { ...ledger, current: { ...ledger.current, payloadSha256: '0'.repeat(64) } } ]) expect(inspectedAssetDecisions(asset, bad).every(d => !d.allowed)).toBe(true);
    expect(inspectedAssetDecisions(asset, ledger)[1].attribution).toEqual(['Art by Ada']);
  });
});
