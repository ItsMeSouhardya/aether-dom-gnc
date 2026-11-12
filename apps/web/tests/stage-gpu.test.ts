import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Scene, Texture } from 'three';
import { createStageRenderer, type GpuStageProps } from '../src/features/stage/gpu-renderer';
import { createPlayback } from '../src/features/stage/playback';
import type { SvgAsset } from '@aether-dom/schema';

const gpu = vi.hoisted(() => ({
  render: vi.fn<(scene: Scene, camera: PerspectiveCamera) => void>(),
  resize: vi.fn(), dispose: vi.fn(), clear: vi.fn(),
  loads: [] as { texture: Texture; loaded: (texture: Texture) => void; failed: () => void }[],
}));

// Real Three scene/geometry/material/texture objects, with only the browser GPU
// boundary and asynchronous image decoding replaced by controllable adapters.
vi.mock('three', async importOriginal => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: class {
      setClearColor() {} setPixelRatio() {}
      setSize = gpu.resize; render = gpu.render; dispose = gpu.dispose; clear = gpu.clear;
    },
    TextureLoader: class {
      load(_url: string, loaded: (texture: Texture) => void, _progress: unknown, failed: () => void) {
        const texture = new actual.Texture();
        gpu.loads.push({ texture, loaded, failed });
        return texture;
      }
    },
  };
});

const svg: SvgAsset = { assetId: 'asset', uri: 'assets/v1.svg', sourceUri: 'original.svg', viewBox: { x: 0, y: 0, width: 200, height: 100 }, root: { id: 'root', tag: 'svg', attributes: {}, text: '', children: [] } };
const base = { x: 0, y: 0, z: 0, scale: 1, rotationDeg: 0 };

function setup(rotationDeg = 0) {
  const events = new Map<string, EventListener>();
  const canvas = {
    style: { visibility: '' },
    getContext: () => ({ isContextLost: () => false }),
    addEventListener: (name: string, listener: EventListener) => events.set(name, listener),
    removeEventListener: (name: string) => events.delete(name),
  } as unknown as HTMLCanvasElement;
  const playback = createPlayback(1000, { now: () => 0, request: () => 1, cancel: () => {} });
  const modes: string[] = [];
  const props: GpuStageProps = { width: 1600, height: 900, camera: { position: { x: 0, y: 0, z: 5 }, fovDeg: 90, aspectRatio: '16:9' },
    layers: [{ id: 'a', svg, transform: { ...base, rotationDeg }, opacity: .5, keyframes: [{ id: 'k', timeMs: 1000, transform: { ...base, z: 2 } }] }, { id: 'b', svg, transform: { ...base, z: 1 } }],
    playback, animate: false, onMode: mode => modes.push(mode),
  };
  return { canvas, events, playback, props, modes };
}

function sceneMeshes() { return gpu.render.mock.lastCall![0].children as Mesh<PlaneGeometry, MeshBasicMaterial>[]; }

beforeEach(() => {
  vi.clearAllMocks(); gpu.loads.length = 0;
  vi.stubGlobal('window', { devicePixelRatio: 1 });
  let serial = 0;
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:test-${++serial}`);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('GPU stage resource lifecycle', () => {
  it('keeps nested SVG text native so inherited fonts are never baked into a standalone image', () => {
    const state = setup();
    const asset: SvgAsset = { ...svg, root: { ...svg.root, children: [{ tag: 'g', id: 'caption-group', attributes: {}, text: '', children: [{ tag: 'text', id: 'caption', attributes: { x: '10', y: '20' }, text: 'Caption with inherited font', children: [] }] }] } };
    const before = JSON.stringify(asset);
    const renderer = createStageRenderer(state.canvas, { ...state.props, layers: [{ ...state.props.layers[0], svg: asset }] });
    expect(state.modes).toEqual(['svg']);
    expect(gpu.loads).toHaveLength(0);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(gpu.render).not.toHaveBeenCalled();
    expect(JSON.stringify(asset)).toBe(before);
    renderer.dispose(); state.playback.dispose();
  });
  it('keeps nested non-scaling strokes native without rasterizing or changing source data', () => {
    const state = setup();
    const asset: SvgAsset = { ...svg, root: { ...svg.root, children: [{ tag: 'g', id: 'group', attributes: {}, text: '', children: [{ tag: 'path', id: 'fixed-stroke', attributes: { d: 'M0 0L100 100', stroke: '#fff', 'vector-effect': 'non-scaling-stroke' }, text: '', children: [] }] }] } };
    const before = JSON.stringify(asset);
    const renderer = createStageRenderer(state.canvas, { ...state.props, layers: [{ ...state.props.layers[0], svg: asset }] });
    expect(state.modes).toEqual(['svg']);
    expect(state.canvas.style.visibility).toBe('hidden');
    expect(gpu.loads).toHaveLength(0);
    expect(gpu.render).not.toHaveBeenCalled();
    expect(JSON.stringify(asset)).toBe(before);
    renderer.dispose(); state.playback.dispose();
  });
  it('releases existing GPU resources when an SVG edit introduces a non-scaling stroke', () => {
    const state = setup(); const renderer = createStageRenderer(state.canvas, state.props);
    const pending = [...gpu.loads];
    const disposeTexture = pending.map(load => vi.spyOn(load.texture, 'dispose'));
    const asset: SvgAsset = { ...svg, uri: 'assets/fixed-stroke.svg', root: { ...svg.root, attributes: { 'vector-effect': 'non-scaling-stroke' } } };
    renderer.update({ ...state.props, layers: [{ ...state.props.layers[0], svg: asset }] });
    expect(state.modes).toEqual(['webgl2', 'svg']);
    expect(gpu.loads).toHaveLength(2);
    disposeTexture.forEach(dispose => expect(dispose).toHaveBeenCalledOnce());
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    const calls = gpu.render.mock.calls.length;
    pending.forEach(load => load.loaded(load.texture));
    expect(gpu.render).toHaveBeenCalledTimes(calls);
    renderer.dispose(); state.playback.dispose();
  });
  it('matches world sizing and stable evaluated depth order, then resizes without reloading textures', () => {
    const state = setup(); const renderer = createStageRenderer(state.canvas, state.props);
    expect(state.modes).toEqual(['webgl2']);
    gpu.loads.forEach(load => load.loaded(load.texture));
    const [a, b] = sceneMeshes();
    expect(a.geometry.parameters).toMatchObject({ width: 2, height: 1 });
    expect(a.material.opacity).toBe(.5);
    expect(a.material.depthWrite).toBe(false);
    expect([a.renderOrder, b.renderOrder]).toEqual([0, 1]);
    state.playback.seek(1000);
    expect(a.position.z).toBe(0);
    renderer.update({ ...state.props, animate: true, width: 800, height: 450 });
    expect(a.position.z).toBe(2);
    expect([a.renderOrder, b.renderOrder]).toEqual([1, 0]);
    expect(gpu.resize).toHaveBeenLastCalledWith(800, 450, false);
    expect(gpu.loads).toHaveLength(2);
    renderer.dispose(); state.playback.dispose();
  });
  it('normalizes enormous finite authored rotations before converting them to radians', () => {
    const state = setup(Number.MAX_VALUE); const renderer = createStageRenderer(state.canvas, state.props);
    gpu.loads.forEach(load => load.loaded(load.texture));
    const [a] = sceneMeshes();
    expect(Number.isFinite(a.rotation.z)).toBe(true);
    expect(a.rotation.z).toBeCloseTo((Number.MAX_VALUE % 360) * Math.PI / 180);
    renderer.dispose(); state.playback.dispose();
  });
  it('disposes obsolete planes and URLs and ignores their late load/error callbacks', () => {
    const state = setup(); const renderer = createStageRenderer(state.canvas, state.props);
    const stale = gpu.loads[0];
    const [a] = sceneMeshes();
    const geometryDispose = vi.spyOn(a.geometry, 'dispose');
    const materialDispose = vi.spyOn(a.material, 'dispose');
    const textureDispose = vi.spyOn(stale.texture, 'dispose');
    renderer.update({ ...state.props, layers: [{ ...state.props.layers[0], svg: { ...svg, uri: 'assets/v2.svg' } }] });
    expect(geometryDispose).toHaveBeenCalledOnce(); expect(materialDispose).toHaveBeenCalledOnce();
    expect(textureDispose).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-1');
    const calls = gpu.render.mock.calls.length;
    stale.loaded(stale.texture); stale.failed();
    expect(gpu.render).toHaveBeenCalledTimes(calls);
    expect(state.modes).toEqual(['webgl2']);
    renderer.dispose(); renderer.dispose(); state.playback.seek(700);
    expect(gpu.dispose).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
    expect(state.events.size).toBe(0);
    state.playback.dispose();
  });
  it('hides the old framebuffer and releases resources on context loss', () => {
    const state = setup(); const renderer = createStageRenderer(state.canvas, state.props);
    gpu.loads.forEach(load => load.loaded(load.texture));
    const event = new Event('webglcontextlost', { cancelable: true });
    state.events.get('webglcontextlost')!(event);
    expect(event.defaultPrevented).toBe(true);
    expect(state.canvas.style.visibility).toBe('hidden');
    expect(state.modes).toEqual(['webgl2', 'svg']);
    const calls = gpu.render.mock.calls.length;
    state.playback.seek(1000); renderer.update(state.props);
    expect(gpu.render).toHaveBeenCalledTimes(calls);
    expect(gpu.dispose).toHaveBeenCalledOnce();
    renderer.dispose(); state.playback.dispose();
  });
});
