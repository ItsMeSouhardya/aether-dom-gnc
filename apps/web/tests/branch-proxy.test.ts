import { afterEach, expect, it, vi } from 'vitest';
import { proxyBranches } from '../src/lib/branch-proxy';
afterEach(() => vi.unstubAllGlobals());
it('forwards a fixed branch list or encoded comparison with no cache', async () => {
  const fetcher = vi.fn(async () => Response.json({ projectId: 'p', branches: [] })); vi.stubGlobal('fetch', fetcher);
  const response = await proxyBranches('p', 'branches', new Request('http://localhost/branches'));
  expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toBe('no-store');
  await proxyBranches('p', 'diff', new Request('http://localhost/diff?left=main&right=child'));
  expect(String((fetcher.mock.calls as unknown as [URL, RequestInit][])[1][0])).toContain('/api/v1/projects/p/diff?left=main&right=child');
});
it.each(['left=main','left=main&right=child&url=https://evil.test','left=main&left=other&right=child','left=..&right=child'])('rejects unsafe comparison query %s', async query => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  expect((await proxyBranches('p', 'diff', new Request('http://localhost/diff?' + query))).status).toBe(422); expect(fetcher).not.toHaveBeenCalled();
});
it('requires same-origin bounded JSON for fork and preserves stale conflicts', async () => {
  const fetcher = vi.fn(async () => Response.json({ detail: { message: 'Stale fork' } }, { status: 409 })); vi.stubGlobal('fetch', fetcher);
  const request = (origin: string, content = 'application/json') => new Request('http://localhost/branches', { method: 'POST', headers: { Host: '127.0.0.1:3000', Origin: origin, 'Content-Type': content }, body: '{}' });
  expect((await proxyBranches('p', 'branches', request('https://other.test'))).status).toBe(403);
  expect((await proxyBranches('p', 'branches', request('http://127.0.0.1:3000', 'text/plain'))).status).toBe(415);
  const response = await proxyBranches('p', 'branches', request('http://127.0.0.1:3000'));
  expect(response.status).toBe(409); expect(await response.json()).toEqual({ detail: { message: 'Stale fork' } }); expect(fetcher).toHaveBeenCalledOnce();
});
it('rejects excessive fork bodies and oversized responses', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  expect((await proxyBranches('p', 'branches', new Request('http://localhost/branches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'x'.repeat(17000) }) }))).status).toBe(413);
  expect(fetcher).not.toHaveBeenCalled();
  vi.stubGlobal('fetch', async () => new Response('{}', { headers: { 'Content-Type': 'application/json', 'Content-Length': String(1024 * 1024 + 1) } }));
  expect((await proxyBranches('p', 'branches', new Request('http://localhost/branches'))).status).toBe(502);
});
