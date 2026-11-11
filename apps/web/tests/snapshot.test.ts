import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from '../../../packages/schema/fixtures/sample.cdom.json';
import { loadSnapshot } from '../src/lib/snapshot';

const health = { status: 'ok', service: 'aether-dom-api', schemaVersion: '0.1.0' };
afterEach(() => vi.unstubAllGlobals());

function respond(document: unknown = fixture, status = 200, healthPayload: unknown = health) {
  vi.stubGlobal('fetch', async (path: string) => Response.json(path.endsWith('health') ? healthPayload : document, { status }));
}

describe('API snapshot boundary', () => {
  it('returns only a validated document from a healthy service', async () => {
    respond();
    const document = await loadSnapshot();
    expect(document.project.title).toBe('Neon Shogun — Rooftop');
    expect(document.characters.map(character => character.name)).toEqual(['Kael', 'Vance']);
  });
  it('rejects an HTTP failure', async () => {
    respond({}, 503);
    await expect(loadSnapshot()).rejects.toThrow('unavailable');
  });
  it('rejects a wrong schema version', async () => {
    respond({ ...fixture, schemaVersion: '9.0.0' });
    await expect(loadSnapshot()).rejects.toThrow('document contract');
  });
  it('rejects a false health response', async () => {
    respond(fixture, 200, { ...health, status: 'error' });
    await expect(loadSnapshot()).rejects.toThrow('health response');
  });
  it('rejects malformed JSON', async () => {
    vi.stubGlobal('fetch', async () => new Response('not json'));
    await expect(loadSnapshot()).rejects.toThrow('valid JSON');
  });
  it('reports a network failure', async () => {
    vi.stubGlobal('fetch', async () => { throw new TypeError('fetch failed'); });
    await expect(loadSnapshot()).rejects.toThrow('unavailable');
  });
});
