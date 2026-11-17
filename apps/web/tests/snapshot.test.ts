import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from '../../../packages/schema/fixtures/sample.cdom.json';
import { loadSnapshot } from '../src/lib/snapshot';

const health = { status: 'ok', service: 'aether-dom-api', schemaVersion: '0.1.0' };
afterEach(() => vi.unstubAllGlobals());

function respond(document: unknown = fixture, status = 200, healthPayload: unknown = health) {
  vi.stubGlobal('fetch', async (path: string) =>
    Response.json(path.endsWith('health') ? healthPayload : document, { status }),
  );
}

describe('API snapshot boundary', () => {
  it('reads the preserved V1 seed from a V2 service that explicitly supports V1', async () => {
    respond(fixture, 200, { ...health, schemaVersion: '0.2.0', supportedSchemaVersions: ['0.1.0', '0.2.0'] });
    expect((await loadSnapshot()).schemaVersion).toBe('0.1.0');
    respond(fixture, 200, { ...health, schemaVersion: '0.2.0', supportedSchemaVersions: ['0.2.0'] });
    await expect(loadSnapshot()).rejects.toThrow('incompatible');
  });
  it('reads the preserved V1 seed from a V4 service that supports V1', async () => {
    respond(fixture, 200, {
      ...health,
      schemaVersion: '0.5.0',
      supportedSchemaVersions: ['0.1.0', '0.2.0', '0.3.0', '0.4.0', '0.5.0'],
    });
    expect((await loadSnapshot()).schemaVersion).toBe('0.1.0');
    respond(fixture, 200, { ...health, schemaVersion: '0.4.0', supportedSchemaVersions: ['0.4.0'] });
    await expect(loadSnapshot()).rejects.toThrow('incompatible');
  });
  it('returns only a validated document from a healthy service', async () => {
    respond();
    const document = await loadSnapshot();
    expect(document.project.title).toBe('Neon Shogun — Rooftop');
    expect(document.characters.map((character) => character.name)).toEqual(['Kael', 'Vance']);
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
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed');
    });
    await expect(loadSnapshot()).rejects.toThrow('unavailable');
  });
});

it('accepts a v6 service that supports the original fixture', async () => {
  respond(fixture, 200, { ...health, schemaVersion: '0.6.0', supportedSchemaVersions: ['0.1.0', '0.6.0'] });
  expect((await loadSnapshot()).schemaVersion).toBe('0.1.0');
});
