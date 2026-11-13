import { describe, expect, it } from 'vitest';
import { playerFixture } from './player-fixture';
import { chooseWebMCodec, planWebM, webMFrame } from '../src/features/export/webm-plan';

const options = { shotId: 'shot_rooftop', aspect: '16:9' as const, durationMs: 500, includeAudio: true };

describe('bounded saved composition recording plan', () => {
  it('validates a saved manifest and plans fixed bounded output sizes without modifying canon', () => {
    const manifest = playerFixture(), before = JSON.stringify(manifest);
    expect(planWebM(manifest, options)).toMatchObject({ width: 1280, height: 720, fps: 24, durationMs: 500 });
    expect(planWebM(manifest, { ...options, aspect: '9:16' })).toMatchObject({ width: 720, height: 1280 });
    expect(planWebM(manifest, { ...options, aspect: '1:1' })).toMatchObject({ width: 720, height: 720 });
    expect(JSON.stringify(manifest)).toBe(before);
  });

  it('rejects invalid duration, identity, aspect and manifest before native resources exist', () => {
    for (const durationMs of [0, -1, NaN, Infinity, 30001, 16001]) expect(() => planWebM(playerFixture(), { ...options, durationMs })).toThrow(/duration/i);
    expect(() => planWebM(playerFixture(), { ...options, shotId: 'missing' })).toThrow(/shot/i);
    expect(() => planWebM(playerFixture(), { ...options, aspect: 'bad' as '16:9' })).toThrow(/aspect/i);
    const invalid = playerFixture(); invalid.document.project.revision = NaN;
    expect(() => planWebM(invalid, options)).toThrow(/manifest/i);
  });

  it('chooses WebM codecs only, with an honest unsupported result', () => {
    expect(chooseWebMCodec(type => type.includes('vp8'))).toBe('video/webm;codecs=vp8,opus');
    expect(chooseWebMCodec(type => type === 'video/webm')).toBe('video/webm');
    expect(chooseWebMCodec(() => false)).toBeNull();
  });

  it('uses shared authored interpolation/projection and sanitized SVG for explicit frame times', () => {
    const manifest = playerFixture();
    manifest.document.schemaVersion = '0.2.0';
    manifest.document.layers[0].keyframes = [{ id: 'export-frame', timeMs: 1000, transform: { ...manifest.document.layers[0].transform, x: 2 } }];
    const plan = planWebM(manifest, options);
    const start = webMFrame(plan, 0), end = webMFrame(plan, 500);
    expect(start).toContain('width="1280" height="720"');
    expect(start).toContain('#101310'); expect(start).toContain('viewBox="0 0 130 200"');
    expect(end).not.toBe(start);
    expect(() => webMFrame(plan, Infinity)).toThrow(/time/i);
  });

  it('preserves native non-scaling stroke and rejects text whose inherited webfont cannot be embedded', () => {
    const manifest = playerFixture(), asset = manifest.assets.find(asset => asset.kind === 'svg')!;
    if (asset.kind !== 'svg') throw new Error('fixture');
    asset.svg.root.children[0].attributes['vector-effect'] = 'non-scaling-stroke';
    expect(webMFrame(planWebM(manifest, options), 0)).toContain('vector-effect="non-scaling-stroke"');
    asset.svg.root.children.push({ id: 'export-text', tag: 'text', attributes: {}, children: [], text: 'Hello' });
    expect(() => planWebM(manifest, options)).toThrow(/font/i);
    asset.svg.root.children[1].attributes['font-family'] = 'sans-serif';
    expect(webMFrame(planWebM(manifest, options), 0)).toContain('font-family="sans-serif"');
  });

  it('does not reject an unsupported font on a layer that is not rendered', () => {
    const manifest = playerFixture(), layer = manifest.document.layers[0];
    const asset = manifest.assets.find(asset => asset.assetId === layer.assetId)!;
    if (asset.kind !== 'svg') throw new Error('fixture');
    asset.svg.root.children.push({ id: 'hidden-text', tag: 'text', text: 'Invisible', attributes: {}, children: [] });
    manifest.document.schemaVersion = '0.2.0'; layer.visible = false;
    expect(webMFrame(planWebM(manifest, options), 0)).not.toContain('Invisible');
  });
});
