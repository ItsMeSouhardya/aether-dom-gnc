import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPlayerManifest, parsePlayerManifest, readPlayerFile } from '../src/lib/player-api';
import { playerFixture } from './player-fixture';

afterEach(() => vi.unstubAllGlobals());
describe('portable player loading', () => {
  it('loads one exact read-only snapshot without media requests', async () => {
    const manifest = playerFixture(), fetcher = vi.fn<(path: string, init?: RequestInit) => Promise<Response>>(async () => Response.json(manifest));
    vi.stubGlobal('fetch', fetcher);
    const controller = new AbortController();
    expect(await loadPlayerManifest('proj_neon_shogun', 'branch_main', 0, controller.signal)).toEqual(manifest);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe('/api/v1/projects/proj_neon_shogun/branches/branch_main/player-manifest?revision=0');
    expect(fetcher.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
  });
  it('rejects mismatched route identity and exact revision', async () => {
    for (const mutate of [(m: ReturnType<typeof playerFixture>) => { m.document.project.revision = 1; }, (m: ReturnType<typeof playerFixture>) => { m.document.project.id = 'different'; }, (m: ReturnType<typeof playerFixture>) => { m.document.project.activeBranchId = 'different'; }]) {
      const manifest = playerFixture(); mutate(manifest);
      vi.stubGlobal('fetch', async () => Response.json(manifest));
      await expect(loadPlayerManifest('proj_neon_shogun', 'branch_main', 0)).rejects.toThrow();
    }
  });
  it('rejects malformed, oversized and deeply nested JSON before rendering', () => {
    for (const raw of ['{', ' '.repeat(32 * 1024 * 1024 + 1), '['.repeat(10000) + ']'.repeat(10000), '{"manifestVersion":"1.0.0","document":null,"assets":[]}']) expect(() => parsePlayerManifest(raw)).toThrow();
    const manifest = playerFixture(); manifest.assets[0] = { ...manifest.assets[0], assetId: 'foreign' };
    expect(() => parsePlayerManifest(JSON.stringify(manifest))).toThrow();
  });
  it('limits streamed bodies even when content-length is missing or dishonest', async () => {
    let cancelled = false;
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(32 * 1024 * 1024)); controller.enqueue(new Uint8Array(1)); }, cancel() { cancelled = true; } });
    vi.stubGlobal('fetch', async () => new Response(body));
    await expect(loadPlayerManifest('proj_neon_shogun', 'branch_main')).rejects.toThrow(/32 MiB/);
    expect(cancelled).toBe(true);
  });
  it('opens portable files locally without API access and checks file bounds first', async () => {
    const manifest = playerFixture(), fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const raw = JSON.stringify(manifest);
    expect(await readPlayerFile(new File([raw], 'story.cdom.json'))).toEqual(manifest);
    const text = vi.fn();
    await expect(readPlayerFile({ size: 32 * 1024 * 1024 + 1, text } as unknown as File)).rejects.toThrow(/32 MiB/);
    expect(text).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
    await expect(readPlayerFile(new File([new Uint8Array([123, 34, 255, 34, 58, 48, 125])], 'invalid.json'))).rejects.toThrow(/UTF-8/);
  });
  it('gives actionable API errors, validates inputs before fetching and allows abort', async () => {
    const fetcher = vi.fn(async () => Response.json({ detail: { message: 'SVG rights are unknown. Set rights in the studio.' } }, { status: 422 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(loadPlayerManifest('proj_neon_shogun', 'branch_main')).rejects.toThrow('SVG rights are unknown');
    fetcher.mockClear();
    for (const revision of [-1, .5, Infinity, Number.MAX_SAFE_INTEGER + 1]) await expect(loadPlayerManifest('p', 'b', revision)).rejects.toThrow();
    await expect(loadPlayerManifest('../p', 'b')).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
    const controller = new AbortController(); controller.abort();
    await expect(loadPlayerManifest('p', 'b', 0, controller.signal)).rejects.toThrow();
  });
});
