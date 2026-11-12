import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { interpolateTransform, nextLayerDepth, projectLayer, unprojectDelta, type StageCamera, type Transform } from '../src/features/stage/geometry';
import { createPlayback, type PlaybackClock } from '../src/features/stage/playback';
import { SvgContent, svgMarkup } from '../src/components/stage/svg-content';
import { stageRenderPlan } from '../src/features/stage/render-plan';
import { createStageRenderer } from '../src/features/stage/gpu-renderer';
import type { SvgNode } from '@aether-dom/schema';

const base: Transform = { x: 0, y: 0, z: 0, scale: 1, rotationDeg: 0 };
const camera: StageCamera = { position: { x: 0, y: 0, z: 5 }, fovDeg: 90, aspectRatio: '16:9' };
const viewport = { width: 1600, height: 900 };
const viewBox = { x: -50, y: 0, width: 200, height: 100 };

describe('camera-correct stage geometry', () => {
  it('projects a centered 200×100 SVG at 100 units/world with hand-calculated dimensions', () => {
    const result = projectLayer({ ...base, x: 1, y: 1, rotationDeg: 30 }, camera, viewport, viewBox);
    expect(result?.x).toBeCloseTo(890);
    expect(result?.y).toBeCloseTo(360);
    expect(result?.width).toBeCloseTo(180);
    expect(result?.height).toBeCloseTo(90);
    expect(result?.pixelsPerWorld).toBeCloseTo(90);
    expect(result?.rotation).toBe(-30);
  });
  it('accounts for camera pan, dolly and FOV in both projection and drag', () => {
    const panned = { ...camera, position: { x: 1, y: 2, z: 10 } };
    const result = projectLayer({ ...base, x: 1, y: 2 }, panned, viewport, viewBox);
    expect(result?.x).toBe(800);
    expect(result?.y).toBe(450);
    expect(result?.width).toBeCloseTo(90);
    expect(unprojectDelta(90, -45, 0, panned, viewport)).toEqual({ x: expect.closeTo(2), y: expect.closeTo(1) });
    const narrow = projectLayer(base, { ...camera, fovDeg: 60 }, viewport, viewBox);
    expect(narrow!.pixelsPerWorld).toBeCloseTo(900 / (10 * Math.tan(Math.PI / 6)));
  });
  it('rejects near/behind, degenerate viewport and nonfinite geometry', () => {
    for (const z of [5, 6, 4.9999, Infinity, NaN]) expect(projectLayer({ ...base, z }, camera, viewport, viewBox)).toBeNull();
    expect(projectLayer({ ...base, scale: Infinity }, camera, viewport, viewBox)).toBeNull();
    expect(projectLayer(base, camera, { width: 0, height: 900 }, viewBox)).toBeNull();
    expect(unprojectDelta(NaN, 0, 0, camera, viewport)).toBeNull();
    expect(unprojectDelta(1, 1, 5, camera, viewport)).toBeNull();
  });
});

describe('animation and layer depth', () => {
  it('renders base transforms in layout mode and sorts evaluated animation depths stably', () => {
    const layers = [
      { id: 'a', transform: base, svg: null, keyframes: [{ id: 'a1', timeMs: 1000, transform: { ...base, z: 2 } }] },
      { id: 'b', transform: { ...base, z: 1 }, svg: null },
      { id: 'c', transform: { ...base, z: 1 }, svg: null },
      { id: 'hidden', transform: base, svg: null, visible: false },
    ];
    expect(stageRenderPlan(layers, 1000, false).map(layer => layer.id)).toEqual(['a', 'b', 'c']);
    expect(stageRenderPlan(layers, 1000, true).map(layer => layer.id)).toEqual(['b', 'c', 'a']);
    expect(stageRenderPlan(layers, 1000, true, 'a').map(layer => layer.id)).toEqual(['b', 'c']);
  });
  it('linearly interpolates all transform values from base at zero without mutating frames', () => {
    const layer = { transform: base, keyframes: [
      { id: 'end', timeMs: 2000, transform: { x: 4, y: 8, z: 2, scale: 3, rotationDeg: 180 } },
      { id: 'mid', timeMs: 1000, transform: { x: 2, y: 4, z: 1, scale: 2, rotationDeg: 90 } },
    ] };
    const before = JSON.stringify(layer);
    expect(interpolateTransform(layer, 500)).toEqual({ x: 1, y: 2, z: .5, scale: 1.5, rotationDeg: 45 });
    expect(interpolateTransform(layer, 1500)).toEqual({ x: 3, y: 6, z: 1.5, scale: 2.5, rotationDeg: 135 });
    expect(interpolateTransform(layer, 9999)).toEqual(layer.keyframes[0].transform);
    expect(interpolateTransform(layer, -20)).toEqual(base);
    expect(JSON.stringify(layer)).toBe(before);
  });
  it('uses an explicit zero frame and returns independent values for static layers', () => {
    expect(interpolateTransform({ transform: base, keyframes: [{ id: 'zero', timeMs: 0, transform: { ...base, x: 9 } }] }, 0).x).toBe(9);
    expect(interpolateTransform({ transform: base }, 300)).toEqual(base);
    expect(interpolateTransform({ transform: base }, 300)).not.toBe(base);
  });
  it('moves only the target past the adjacent slot with stable ties', () => {
    const layers = [0, 0, 1, 2].map((z, i) => ({ id: String(i), transform: { ...base, z } }));
    const before = JSON.stringify(layers);
    expect(nextLayerDepth(layers, '0', 'forward')).toBe(.5);
    expect(nextLayerDepth(layers, '2', 'backward')).toBeLessThan(0);
    expect(nextLayerDepth(layers, '3', 'forward')).toBeNull();
    expect(nextLayerDepth(layers, '0', 'backward')).toBeNull();
    expect(nextLayerDepth(layers, 'missing', 'forward')).toBeNull();
    expect(JSON.stringify(layers)).toBe(before);
  });
  it('does not overflow finite depth bounds', () => {
    const layers = [Number.MAX_VALUE / 2, Number.MAX_VALUE].map((z, i) => ({ id: String(i), transform: { ...base, z } }));
    expect(nextLayerDepth(layers, '0', 'forward')).toBeNull();
  });
});

function fakeClock() {
  let now = 0;
  let sequence = 0;
  const callbacks = new Map<number, (time: number) => void>();
  const clock: PlaybackClock = { now: () => now, request: cb => { callbacks.set(++sequence, cb); return sequence; }, cancel: id => { callbacks.delete(id); } };
  return { clock, pending: () => callbacks.size, advance: (ms: number) => { now += ms; const batch = [...callbacks.values()]; callbacks.clear(); batch.forEach(cb => cb(now)); } };
}

describe('single playback clock', () => {
  it('uses one frame, pauses precisely, seeks while playing and stops at the end', () => {
    const fake = fakeClock();
    const playback = createPlayback(1000, fake.clock);
    let updates = 0;
    const unsubscribe = playback.subscribe(() => { updates++; });
    playback.play(); playback.play();
    expect(fake.pending()).toBe(1);
    fake.advance(200);
    expect(playback.getSnapshot()).toEqual({ timeMs: 200, playing: true });
    playback.seek(700); fake.advance(100);
    expect(playback.getSnapshot().timeMs).toBe(800);
    playback.pause();
    expect(fake.pending()).toBe(0);
    fake.advance(50); expect(playback.getSnapshot().timeMs).toBe(800);
    playback.play(); fake.advance(500);
    expect(playback.getSnapshot()).toEqual({ timeMs: 1000, playing: false });
    expect(fake.pending()).toBe(0);
    expect(updates).toBeGreaterThan(3);
    unsubscribe(); playback.dispose();
  });
  it('clamps seeks, restarts after the end and cancels callbacks on disposal', () => {
    const fake = fakeClock(); const playback = createPlayback(500, fake.clock);
    playback.seek(-1); expect(playback.getSnapshot().timeMs).toBe(0);
    playback.seek(Infinity); expect(playback.getSnapshot().timeMs).toBe(500);
    playback.play(); expect(playback.getSnapshot().timeMs).toBe(0);
    playback.dispose(); expect(fake.pending()).toBe(0);
    playback.play(); playback.seek(10); fake.advance(100);
    expect(fake.pending()).toBe(0);
    expect(playback.getSnapshot().playing).toBe(false);
    const empty = createPlayback(NaN, fake.clock); empty.play();
    expect(empty.getSnapshot()).toEqual({ timeMs: 0, playing: false });
  });
});

const svg = { assetId: 'a', uri: 'local.svg', sourceUri: 'original.svg', viewBox: { x: 0, y: 0, width: 200, height: 100 }, root: {
  tag: 'svg' as const, id: 'root', attributes: {}, text: '', children: [{ tag: 'text' as const, id: 'message', attributes: { x: '5', fill: '#fff' }, text: '<hello> & "world"', children: [] }],
} };

describe('structured SVG rendering', () => {
  it('serializes only a safe tree and XML-escapes text and attribute values', () => {
    const markup = svgMarkup(svg);
    expect(markup).toContain('viewBox="0 0 200 100"');
    expect(markup).toContain('id="message"');
    expect(markup).toContain('&lt;hello&gt; &amp; &quot;world&quot;');
    expect(markup).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(markup).not.toContain('sourceUri');
  });
  it('normalizes root viewport attributes without emitting duplicate XML attributes', () => {
    const sized = structuredClone(svg);
    sized.root.attributes = { width: '200px', height: '100px', preserveAspectRatio: 'xMidYMid meet' };
    const markup = svgMarkup(sized);
    expect(markup.match(/ width=/g)).toHaveLength(1);
    expect(markup.match(/ height=/g)).toHaveLength(1);
  });
  it('bounds texture raster dimensions without changing the authored viewBox', () => {
    const large = { ...svg, viewBox: { x: 0, y: 0, width: 1000000, height: 500000 } };
    const markup = svgMarkup(large);
    expect(markup).toContain('viewBox="0 0 1000000 500000"');
    expect(markup).toContain('width="2048" height="1024"');
  });
  it('scopes DOM IDs independently of stable source IDs', () => {
    const markup = renderToStaticMarkup(createElement(SvgContent, { node: svg.root, scopeId: 'layer one', selectedId: 'message' }));
    expect(markup).toContain('data-element-id="message"');
    expect(markup).toContain('data-selected="true"');
    expect(markup).not.toContain(' id="message"');
    expect(markup).not.toContain('<hello>');
    const other = renderToStaticMarkup(createElement(SvgContent, { node: svg.root, scopeId: 'layer two' }));
    expect(markup.match(/ id="([^"]+)"/)?.[1]).not.toEqual(other.match(/ id="([^"]+)"/)?.[1]);
  });
  it('rejects arbitrary properties and executable values even before the upstream validator', () => {
    const unsafe = structuredClone(svg);
    unsafe.root.attributes = { onload: 'alert(1)' };
    expect(() => svgMarkup(unsafe)).toThrow();
    unsafe.root.attributes = { fill: 'url(https://bad.example/x)' };
    expect(() => svgMarkup(unsafe)).toThrow();
  });
  it('uses the same sixteen-level tree bound for native SVG and texture markup', () => {
    let child: SvgNode = { tag: 'g', id: 'leaf', text: '', attributes: {}, children: [] };
    for (let depth = 0; depth < 15; depth++) child = { tag: 'g', id: `g-${depth}`, text: '', attributes: {}, children: [child] };
    const deep = { ...svg, root: { ...svg.root, children: [child] } };
    expect(() => svgMarkup(deep)).toThrow();
    expect(() => SvgContent({ node: deep.root, scopeId: 'test' })).toThrow();
  });
});

it('falls back before constructing Three when WebGL2 is unavailable', () => {
  const requested: string[] = [];
  const modes: string[] = [];
  const playback = createPlayback(1000, fakeClock().clock);
  const style = { visibility: '' };
  const canvas = { style, getContext: (kind: string) => { requested.push(kind); return null; }, removeEventListener: () => {} } as unknown as HTMLCanvasElement;
  const renderer = createStageRenderer(canvas, { width: 1600, height: 900, camera, layers: [], playback, animate: false, onMode: mode => modes.push(mode) });
  expect(requested).toEqual(['webgl2']);
  expect(modes).toEqual(['svg']);
  expect(style.visibility).toBe('hidden');
  renderer.dispose(); renderer.dispose();
  expect(modes).toEqual(['svg']);
  playback.dispose();
});
