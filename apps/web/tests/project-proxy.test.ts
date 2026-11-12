import { afterEach, expect, it, vi } from 'vitest';
import { proxyProjectApi, proxyProjectAssetApi } from '../src/lib/project-proxy';
const params = { projectId: 'proj_neon_shogun', branchId: 'branch_main' };
afterEach(() => vi.unstubAllGlobals());
it('uses the incoming Host for same-origin checks when Next normalizes its internal URL', async () => {
  const fetcher = vi.fn(async () => Response.json({ saved: true })); vi.stubGlobal('fetch', fetcher);
  const response = await proxyProjectApi(params, 'commands', new Request('http://localhost:3100/api/commands', { method: 'POST', headers: { 'Content-Type': 'application/json', Host: '127.0.0.1:3100', Origin: 'http://127.0.0.1:3100' }, body: '{}' }));
  expect(response.status).toBe(200);
  expect(fetcher).toHaveBeenCalledOnce();
});
it('preserves upstream revision conflicts and their details', async () => {
  vi.stubGlobal('fetch', async () => Response.json({ detail: { code: 'REVISION_CONFLICT', currentRevision: 2 } }, { status: 409 }));
  const response = await proxyProjectApi(params, 'commands', new Request('http://127.0.0.1:3000/api/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }));
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ detail: { code: 'REVISION_CONFLICT', currentRevision: 2 } });
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});
it('rejects a cross-origin write before forwarding it', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  const response = await proxyProjectApi(params, 'commands', new Request('http://localhost:3000/api/commands', { method: 'POST', headers: { 'Content-Type': 'application/json', Host: '127.0.0.1:3000', Origin: 'https://other.example' }, body: '{}' }));
  expect(response.status).toBe(403);
  expect(fetcher).not.toHaveBeenCalled();
});
it('requires JSON content for writes', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  const response = await proxyProjectApi(params, 'commands', new Request('http://127.0.0.1:3000/api/commands', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' }));
  expect(response.status).toBe(415);
  expect(fetcher).not.toHaveBeenCalled();
});
it('returns a failed upstream honestly', async () => {
  vi.stubGlobal('fetch', async () => { throw new TypeError('offline'); });
  expect((await proxyProjectApi(params, 'document')).status).toBe(502);
});

it('forwards only the encoded referenced asset path and optional exact revision', async () => {
  const fetcher = vi.fn(async () => Response.json({assetId:'lamp'}, {status:200}));
  vi.stubGlobal('fetch',fetcher);
  const response = await proxyProjectAssetApi({...params,assetId:'lamp/灯'},new Request('http://localhost/assets/lamp?revision=12'));
  expect(response.status).toBe(200);
  const [url,init] = fetcher.mock.calls[0] as unknown as [URL,RequestInit];
  expect(url.pathname).toBe('/api/v1/projects/proj_neon_shogun/branches/branch_main/assets/lamp%2F%E7%81%AF');
  expect(url.search).toBe('?revision=12');
  expect(init.method).toBe('GET');
  expect(init.cache).toBe('no-store');
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});
it.each(['revision=-1','revision=1.5','revision=9007199254740992','revision=NaN','revision=','revision=1&revision=2','uri=assets/originals/private.svg','revision=2&url=https://evil.test'])('rejects unsafe asset query %s before fetching',async query => {
  const fetcher = vi.fn();vi.stubGlobal('fetch',fetcher);
  expect((await proxyProjectAssetApi({...params,assetId:'lamp'},new Request(`http://localhost/assets/lamp?${query}`))).status).toBe(422);
  expect(fetcher).not.toHaveBeenCalled();
});
it('preserves missing historical assets and rejects dot-path asset IDs',async () => {
  const fetcher = vi.fn(async () => Response.json({detail:{code:'ASSET_NOT_FOUND'}},{status:404}));
  vi.stubGlobal('fetch',fetcher);
  expect((await proxyProjectAssetApi({...params,assetId:'lamp'},new Request('http://localhost/assets/lamp'))).status).toBe(404);
  expect((await proxyProjectAssetApi({...params,assetId:'..'},new Request('http://localhost/assets/lamp'))).status).toBe(422);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
