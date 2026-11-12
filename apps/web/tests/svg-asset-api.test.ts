import { afterEach, expect, it, vi } from 'vitest';
import { loadSvgAsset } from '../src/lib/svg-asset-api';

const asset = { assetId: 'asset_prop', uri: 'assets/imported/one.svg', sourceUri: 'assets/originals/one.svg', viewBox: { x: 0, y: 0, width: 100, height: 100 }, root: { tag: 'svg', id: 'root', attributes: {}, text: '', children: [{ tag: 'rect', id: 'prop', attributes: { width: '100', height: '100', fill: '#334455' }, text: '', children: [] }] } };
const document = { project: { id: 'proj_neon_shogun', activeBranchId: 'branch_main', revision: 3 } };
afterEach(() => vi.unstubAllGlobals());
it('loads the exact immutable revision and verifies asset identity', async () => {
  let requested = '';
  vi.stubGlobal('fetch', async (path: string) => { requested = path; return Response.json(asset); });
  expect((await loadSvgAsset(document, { id: 'asset_prop', uri: asset.uri })).root.children[0].id).toBe('prop');
  expect(requested).toContain('/assets/asset_prop?revision=3');
});
it('rejects obsolete asset content, unsafe models and failure responses', async () => {
  for (const value of [{ ...asset, uri: 'obsolete.svg' }, { ...asset, assetId: 'other' }, { ...asset, root: { ...asset.root, tag: 'script' } }]) {
    vi.stubGlobal('fetch', async () => Response.json(value));
    await expect(loadSvgAsset(document, { id: 'asset_prop', uri: asset.uri })).rejects.toThrow();
  }
  vi.stubGlobal('fetch', async () => Response.json({ detail: { message: 'Unavailable' } }, { status: 404 }));
  await expect(loadSvgAsset(document, { id: 'asset_prop', uri: asset.uri })).rejects.toThrow('Unavailable');
});
