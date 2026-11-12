import { expect, it, vi } from 'vitest';
import { embeddedAudioLoader, embeddedSvgAssets, playerRevision } from '../src/features/player/manifest';
import { playerFixture } from './player-fixture';

it('keys embedded SVGs by saved asset identity and never fetches media', async () => {
  const manifest = playerFixture(), fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  try {
    const states = embeddedSvgAssets(manifest), asset = manifest.document.assets[0];
    expect(states[`${asset.id}:${asset.uri}`]?.svg?.assetId).toBe(asset.id);
    const audio = manifest.document.assets.find(asset => asset.kind === 'audio')!;
    const load = embeddedAudioLoader(manifest);
    expect(new TextDecoder().decode((await load(manifest.document, audio, new AbortController().signal)).slice(0, 4))).toBe('RIFF');
    await expect(load(manifest.document, { ...audio, uri: 'https://outside.invalid/a.wav' }, new AbortController().signal)).rejects.toThrow();
    await expect(load(manifest.document, { id: 'missing', uri: '' }, new AbortController().signal)).rejects.toThrow();
    const controller = new AbortController(); controller.abort();
    await expect(load(manifest.document, audio, controller.signal)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});

it('accepts only a single exact safe revision parameter', () => {
  expect(playerRevision({})).toEqual({});
  expect(playerRevision({ revision: '0' })).toEqual({ revision: 0 });
  expect(playerRevision({ revision: '42' })).toEqual({ revision: 42 });
  expect(playerRevision({ projectId: 'other_project', branchId: 'other_branch', revision: '42' })).toEqual({ projectId: 'other_project', branchId: 'other_branch', revision: 42 });
  for (const query of [{ revision: '-1' }, { revision: '1.2' }, { revision: '01' }, { revision: ['1', '2'] }, { revision: '9007199254740992' }, { other: 'yes' }, { projectId: 'one' }, { projectId: '../one', branchId: 'branch' }, { projectId: ['one', 'two'], branchId: 'branch' }]) expect(playerRevision(query).error).toBeTruthy();
});
