import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAudioAsset } from '../src/lib/audio-asset-api';
import { proxyAudioAsset } from '../src/lib/audio-proxy';
const document = { project: { id: 'project', activeBranchId: 'branch', revision: 4 } };
const asset = { id: 'asset_ambient', uri: 'assets/fixtures/ambient.wav' };
const wav = readFileSync(resolve('../../assets/fixtures/ambient.wav'));
const response = () => new Response(wav, { headers: { 'Content-Type': 'audio/wav', 'Content-Length': String(wav.length) } });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('loads only a fixed referenced asset at the exact saved revision', async () => {
  const fetcher = vi.fn<(input: RequestInfo | URL) => Promise<Response>>(async () => response()); vi.stubGlobal('fetch', fetcher);
  const bytes = await loadAudioAsset(document, asset, new AbortController().signal);
  expect(bytes.byteLength).toBe(wav.length);
  expect(fetcher.mock.calls[0][0]).toBe('/api/v1/projects/project/branches/branch/audio/asset_ambient?revision=4');
});

it('rejects unexpected content, oversized bodies and explicit missing-file errors', async () => {
  for (const value of [new Response('unsafe', { headers: { 'Content-Type': 'text/html' } }), new Response(new Uint8Array(8 * 1024 * 1024 + 1), { headers: { 'Content-Type': 'audio/wav' } }), new Response('bad wave', { headers: { 'Content-Type': 'audio/wav' } })]) {
    vi.stubGlobal('fetch', async () => value);
    await expect(loadAudioAsset(document, asset, new AbortController().signal)).rejects.toThrow();
  }
  vi.stubGlobal('fetch', async () => Response.json({ detail: { message: 'Audio file is missing.' } }, { status: 404 }));
  await expect(loadAudioAsset(document, asset, new AbortController().signal)).rejects.toThrow('missing');
});

it('forwards binary audio without converting it to JSON and preserves error status', async () => {
  vi.stubEnv('AETHER_API_ORIGIN', 'http://127.0.0.1:8000');
  const fetcher = vi.fn<(input: RequestInfo | URL) => Promise<Response>>(async () => response()); vi.stubGlobal('fetch', fetcher);
  const params = { projectId: 'project', branchId: 'branch', assetId: asset.id };
  const reply = await proxyAudioAsset(params, new Request('http://localhost/api/audio?revision=4'));
  expect(reply.status).toBe(200); expect(reply.headers.get('Content-Type')).toBe('audio/wav');
  expect(reply.headers.get('Cache-Control')).toBe('no-store');
  expect(new Uint8Array(await reply.arrayBuffer())).toEqual(new Uint8Array(wav));
  expect(String(fetcher.mock.calls[0][0])).toContain('/audio/asset_ambient?revision=4');
  vi.stubGlobal('fetch', async () => Response.json({ detail: { message: 'Not found' } }, { status: 404 }));
  expect((await proxyAudioAsset(params, new Request('http://localhost/api/audio'))).status).toBe(404);
});

it('rejects malformed revision and path requests before fetching', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  for (const query of ['?revision=-1', '?revision=1.5', '?revision=2&revision=3', '?path=secret', '?revision=9007199254740992']) {
    expect((await proxyAudioAsset({ projectId: 'p', branchId: 'b', assetId: 'a' }, new Request(`http://localhost/audio${query}`))).status).toBe(422);
  }
  expect((await proxyAudioAsset({ projectId: 'p', branchId: 'b', assetId: '..' }, new Request('http://localhost/audio'))).status).toBe(422);
  expect(fetcher).not.toHaveBeenCalled();
});
