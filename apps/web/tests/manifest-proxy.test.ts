import { afterEach, expect, it, vi } from 'vitest';
import { proxyPlayerManifest } from '../src/lib/manifest-proxy';
const params = { projectId: 'proj_neon_shogun', branchId: 'branch_main' };
afterEach(() => vi.unstubAllGlobals());
it('forwards only a fixed revision-bound manifest and sets a safe download filename', async () => {
  const fetcher = vi.fn(async () => Response.json({ manifestVersion: '1.0.0' })); vi.stubGlobal('fetch', fetcher);
  const response = await proxyPlayerManifest(params, new Request('http://localhost/manifest?revision=6&download=1'));
  expect(response.status).toBe(200);
  const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
  expect(url.pathname).toBe('/api/v1/projects/proj_neon_shogun/branches/branch_main/player-manifest');
  expect(url.search).toBe('?revision=6&download=1'); expect(init.cache).toBe('no-store');
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="aether-dom-r6.cdom.json"');
});
it.each(['revision=-1', 'revision=1.2', 'revision=01', 'revision=9007199254740992', 'revision=1&revision=2', 'download=0', 'download=1&download=1', 'url=https://other.test'])('rejects invalid query %s before fetching', async query => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  expect((await proxyPlayerManifest(params, new Request('http://localhost/manifest?' + query))).status).toBe(422);
  expect(fetcher).not.toHaveBeenCalled();
});
it('rejects dot identities and preserves actionable upstream failures', async () => {
  const fetcher = vi.fn(async () => Response.json({ detail: { message: 'Missing media' } }, { status: 422 })); vi.stubGlobal('fetch', fetcher);
  expect((await proxyPlayerManifest({ ...params, branchId: '..' }, new Request('http://localhost/manifest'))).status).toBe(422);
  const response = await proxyPlayerManifest(params, new Request('http://localhost/manifest'));
  expect(response.status).toBe(422); expect(await response.json()).toEqual({ detail: { message: 'Missing media' } });
  expect(fetcher).toHaveBeenCalledOnce();
});
it('bounds manifest responses and rejects non-JSON content', async () => {
  vi.stubGlobal('fetch', async () => new Response('{}', { headers: { 'Content-Type': 'text/html' } }));
  expect((await proxyPlayerManifest(params, new Request('http://localhost/manifest'))).status).toBe(502);
  vi.stubGlobal('fetch', async () => new Response('{}', { headers: { 'Content-Type': 'application/json', 'Content-Length': String(32 * 1024 * 1024 + 1) } }));
  expect((await proxyPlayerManifest(params, new Request('http://localhost/manifest'))).status).toBe(502);
});
