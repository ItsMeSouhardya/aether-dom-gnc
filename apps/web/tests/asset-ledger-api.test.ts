import { expect, it, vi, afterEach } from 'vitest';
import { loadAssetLedger } from '../src/lib/asset-ledger-api';
const identity = { projectId: 'project', branchId: 'branch', assetId: 'asset_é', revision: 4 };
afterEach(() => vi.unstubAllGlobals());
it('encodes the opaque asset identity and rejects a mismatched response', async () => {
  const fetcher = vi.fn(async () => Response.json({ ...identity, original: null, current: null, evidence: [], error: 'Missing media' })); vi.stubGlobal('fetch', fetcher);
  expect((await loadAssetLedger(identity)).assetId).toBe(identity.assetId);
  expect(String((fetcher.mock.calls as unknown as [string][])[0][0])).toContain('asset_%C3%A9/ledger?revision=4');
  vi.stubGlobal('fetch', async () => Response.json({ ...identity, revision: 3, original: null, current: null, evidence: [], error: null }));
  await expect(loadAssetLedger(identity)).rejects.toThrow(/match/i);
});
