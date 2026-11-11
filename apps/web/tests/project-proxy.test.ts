import { afterEach, expect, it, vi } from 'vitest';
import { proxyProjectApi } from '../src/lib/project-proxy';
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
