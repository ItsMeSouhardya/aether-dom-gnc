import { describe, expect, it } from 'vitest';
import type { CdomDocument } from '@aether-dom/schema';
import fixture from '../../../packages/schema/fixtures/sample.cdom.json';
import { createAudioPreview } from '../src/features/audio/engine';
import type { AudioSettings } from '../src/features/audio/types';
import { createPlayback, type PlaybackClock } from '../src/features/stage/playback';

// Graph double records connections, source lifetimes and AudioParam scheduling at
// the browser boundary; the real controller, evaluator and transport run intact.
class Param {
  value = 0; targets: [number, number, number][] = [];
  setTargetAtTime(value: number, time: number, constant: number) { this.value = value; this.targets.push([value, time, constant]); }
  setValueAtTime(value: number) { this.value = value; }
}
class Node {
  outputs = new Set<Node>(); disconnected = false;
  connect(node: Node) { this.outputs.add(node); return node; }
  disconnect() { this.outputs.clear(); this.disconnected = true; }
}
class Gain extends Node { gain = new Param(); }
class Stereo extends Node { pan = new Param(); }
class Spatial extends Node {
  panningModel = 'HRTF'; distanceModel = 'inverse'; rolloffFactor = 1;
  positionX = new Param(); positionY = new Param(); positionZ = new Param();
}
class Source extends Node {
  buffer: AudioBuffer | null = null; loop = false; active = false; starts: [number, number][] = []; stops = 0;
  onended: (() => void) | null = null; stopAt = Infinity;
  constructor(private now: () => number) { super(); }
  start(when: number, offset: number) { if (this.active) throw new Error('duplicate start'); this.active = true; this.starts.push([when, offset]); }
  stop(when = 0) { this.stopAt = when; this.stops++; this.advance(this.now()); }
  advance(time: number) { if (this.active && time >= this.stopAt) { this.active = false; this.onended?.(); } }
}
class Analyser extends Node {
  fftSize = 256; frequencyBinCount = 128; smoothingTimeConstant = 0;
  getByteFrequencyData(data: Uint8Array) { data.fill(255); }
}
class Context {
  private audioTime = 3;
  get currentTime() { return this.audioTime; }
  set currentTime(time: number) { this.audioTime = time; this.sources.forEach(source => source.advance(time)); }
  state = 'suspended'; destination = new Node(); sources: Source[] = []; gains: Gain[] = []; stereos: Stereo[] = []; spatials: Spatial[] = [];
  listener = { forwardX: new Param(), forwardY: new Param(), forwardZ: new Param(), upX: new Param(), upY: new Param(), upZ: new Param() };
  resumes = 0; closes = 0; decodeError = false; spatialError = false;
  resume() { this.resumes++; this.state = 'running'; return Promise.resolve(); }
  close() { this.closes++; this.state = 'closed'; return Promise.resolve(); }
  createGain() { const node = new Gain(); this.gains.push(node); return node; }
  createStereoPanner() { const node = new Stereo(); this.stereos.push(node); return node; }
  createPanner() { if (this.spatialError) throw new Error('unsupported panner'); const node = new Spatial(); this.spatials.push(node); return node; }
  createAnalyser() { return new Analyser(); }
  createBufferSource() { const source = new Source(() => this.currentTime); this.sources.push(source); return source; }
  async decodeAudioData() { if (this.decodeError) throw new Error('bad decode'); return { duration: 8, numberOfChannels: 1, sampleRate: 22050 } as AudioBuffer; }
}
function setup(context = new Context()) {
  let now = 0; let pending: ((time: number) => void) | undefined;
  const clock: PlaybackClock = { now: () => now, request: callback => { pending = callback; return 1; }, cancel: () => { pending = undefined; } };
  const playback = createPlayback(16000, clock);
  const settings: AudioSettings = { document: structuredClone(fixture) as CdomDocument, shotId: 'shot_rooftop', animate: true, tensionPreview: null, masterGain: .6, muted: false, spatialMode: 'headphones', reactiveGlow: true };
  let contexts = 0;
  const dependencies = { contextFactory: () => { contexts++; return context as unknown as AudioContext; }, loadAsset: async () => new ArrayBuffer(44) };
  const runtime = createAudioPreview(playback, settings, dependencies);
  return { context, contexts: () => contexts, playback, settings, runtime, advance(ms: number) { now += ms; context.currentTime += ms / 1000; const callback = pending; pending = undefined; callback?.(now); } };
}

describe('gesture-owned native audio controller', () => {
  it('stays silent before explicit enable and resumes synchronously in the gesture stack', async () => {
    const env = setup(); env.playback.play(); env.advance(1000);
    expect(env.contexts()).toBe(0);
    const enabled = env.runtime.enable();
    expect(env.contexts()).toBe(1); expect(env.context.resumes).toBe(1);
    await enabled;
    expect(env.runtime.getSnapshot()).toMatchObject({ state: 'ready', enabled: true });
    expect(env.context.sources).toHaveLength(3);
    expect(env.context.sources.map(source => source.starts)).toEqual([[[4, 1]], [[4, 1]], [[4, 1]]]);
    expect(env.context.sources.every(source => source.loop && source.active && source.outputs.size === 1)).toBe(true);
    env.runtime.dispose(); env.playback.dispose();
    expect(env.context.sources.every(source => !source.active && source.outputs.size === 0)).toBe(true);
    expect(env.context.closes).toBe(1);
  });
  it('restarts only on explicit seeks/play and keeps a single phase-aligned source per track', async () => {
    const env = setup(); await env.runtime.enable();
    expect(env.context.sources).toHaveLength(0);
    env.playback.seek(9500); env.playback.play();
    expect(env.context.sources.map(source => source.starts[0][1])).toEqual([1.5, 1.5, 1.5]);
    const status = env.runtime.getSnapshot();
    env.advance(16); env.advance(16);
    env.runtime.update({ ...env.settings, tensionPreview: 1, masterGain: .3 });
    env.runtime.setLayerDraft('layer_sign', { x: -5, y: 0, z: 0, scale: 1, rotationDeg: 0 });
    expect(env.context.sources).toHaveLength(3);
    expect(env.runtime.getSnapshot()).toBe(status);
    expect(env.runtime.getFrame().tracks[2].pan).toBe(-1);
    expect(env.context.stereos[2].pan.value).toBe(-1);
    env.playback.seek(9500); env.playback.seek(9500);
    expect(env.context.sources).toHaveLength(9);
    expect(env.context.sources.filter(source => source.active)).toHaveLength(3);
    expect(env.context.sources.slice(-3).map(source => source.starts[0][1])).toEqual([1.5, 1.5, 1.5]);
    env.playback.pause(); expect(env.context.sources.every(source => !source.active)).toBe(true);
    env.playback.seek(4000); expect(env.context.sources).toHaveLength(9);
    env.playback.play(); expect(env.context.sources.slice(-3).map(source => source.starts[0][1])).toEqual([4, 4, 4]);
    env.advance(16000); expect(env.context.sources.every(source => !source.active)).toBe(true);
    env.runtime.dispose(); env.playback.dispose();
  });
  it('smooths volume and publishes bounded analyser frames without high-frequency status updates', async () => {
    const env = setup(); await env.runtime.enable(); let statuses = 0; const levels: number[] = [];
    env.runtime.subscribe(() => { statuses++; }); env.runtime.subscribeFrame(frame => levels.push(frame.level));
    env.playback.play(); env.advance(16); env.advance(16);
    env.runtime.update({ ...env.settings, muted: true });
    expect(env.context.gains[0].gain.value).toBe(0);
    expect(env.context.gains.every(gain => gain.gain.targets.every(([value, , constant]) => Number.isFinite(value) && constant > 0))).toBe(true);
    expect(levels.length).toBeGreaterThan(1); expect(levels.every(level => Number.isFinite(level) && level >= 0 && level <= 1)).toBe(true);
    expect(statuses).toBe(0);
    env.runtime.dispose(); env.playback.dispose();
  });
  it('stops existing voices when a seek reaches the timeline end', async () => {
    const env = setup(); await env.runtime.enable(); env.playback.play();
    env.playback.seek(16000);
    expect(env.playback.getSnapshot().playing).toBe(false);
    expect(env.context.sources.every(source => !source.active)).toBe(true);
    expect(env.runtime.getFrame().level).toBe(0);
    env.runtime.dispose(); env.playback.dispose();
  });
  it('ends looped voices on the native audio clock when visual frames stop', async () => {
    const env = setup(); await env.runtime.enable();
    env.playback.seek(9500); env.playback.play();
    expect(env.context.sources.map(source => source.stopAt)).toEqual([9.5, 9.5, 9.5]);
    env.context.currentTime = 9.49;
    expect(env.context.sources.filter(source => source.active)).toHaveLength(3);
    env.context.currentTime = 9.5;
    expect(env.playback.getSnapshot()).toEqual({ timeMs: 9500, playing: true });
    expect(env.context.sources.every(source => !source.active && source.outputs.size === 0)).toBe(true);
    expect(env.runtime.getFrame().level).toBe(0);
    env.playback.seek(1000);
    expect(env.context.sources.filter(source => source.active)).toHaveLength(3);
    expect(env.context.sources.slice(-3).map(source => source.stopAt)).toEqual([24.5, 24.5, 24.5]);
    env.context.currentTime = 24.5;
    env.playback.seek(16000); env.runtime.dispose(); env.playback.dispose();
    expect(env.context.sources.every(source => !source.active)).toBe(true);
  });
  it('ignores a decode that completes after disposal and permits a fresh StrictMode controller', async () => {
    const env = setup(); env.runtime.dispose();
    let complete!: (buffer: AudioBuffer) => void;
    env.context.decodeAudioData = () => new Promise(resolve => { complete = resolve; });
    const runtime = createAudioPreview(env.playback, { ...env.settings, document: { ...env.settings.document, shots: env.settings.document.shots.map(shot => ({ ...shot, audioTrackIds: ['track_ambient'] })) } }, { contextFactory: () => env.context as unknown as AudioContext, loadAsset: async () => new ArrayBuffer(44) });
    env.playback.play(); const enabled = runtime.enable();
    await Promise.resolve();
    runtime.dispose();
    complete({ duration: 8, numberOfChannels: 1, sampleRate: 22050 } as AudioBuffer);
    await enabled;
    expect(env.context.sources).toHaveLength(0);
    expect(env.context.closes).toBe(1);
    const fresh = setup(); await fresh.runtime.enable(); fresh.playback.play();
    expect(fresh.context.sources.filter(source => source.active)).toHaveLength(3);
    fresh.runtime.dispose(); fresh.playback.dispose(); env.playback.dispose();
  });
  it('cancels obsolete loads and decodes after disable, disposal and rapid shot changes', async () => {
    const env = setup(); env.runtime.dispose();
    const deferred: (() => void)[] = [];
    const signals: AbortSignal[] = [];
    const runtime = createAudioPreview(env.playback, env.settings, { contextFactory: () => env.context as unknown as AudioContext, loadAsset: (_doc, _asset, signal) => { signals.push(signal); return new Promise(resolve => deferred.push(() => resolve(new ArrayBuffer(44)))); } });
    env.playback.play(); const enabled = runtime.enable();
    runtime.update({ ...env.settings, shotId: null });
    deferred.forEach(resolve => resolve()); await enabled;
    expect(signals.every(signal => signal.aborted)).toBe(true);
    expect(env.context.sources).toHaveLength(0);
    runtime.disable(); runtime.dispose();
    expect(env.context.closes).toBe(1);
    expect(runtime.getSnapshot()).toMatchObject({ state: 'off', enabled: false });
    await runtime.enable(); expect(env.context.resumes).toBe(1);
    env.playback.dispose();
  });
  it('reports decode failure, closes resources and supports an explicit retry', async () => {
    const env = setup(); env.context.decodeError = true;
    await env.runtime.enable();
    expect(env.runtime.getSnapshot()).toMatchObject({ state: 'error', enabled: false });
    expect(env.context.closes).toBe(1);
    env.context.decodeError = false;
    await env.runtime.enable();
    expect(env.runtime.getSnapshot()).toMatchObject({ state: 'ready', enabled: true });
    env.runtime.disable(); env.runtime.disable(); env.playback.dispose();
    expect(env.context.closes).toBe(2);
  });
  it('accepts a validated WAV resampled by the browser to a higher device sample rate', async () => {
    const env = setup();
    env.context.decodeAudioData = async () => ({ duration: 8, numberOfChannels: 1, sampleRate: 96000 } as AudioBuffer);
    await env.runtime.enable(); env.playback.play();
    expect(env.runtime.getSnapshot().state).toBe('ready');
    expect(env.context.sources.filter(source => source.active)).toHaveLength(3);
    env.runtime.dispose(); env.playback.dispose();
  });
  it('switches spatial routes without restarting voices and discloses stereo fallback', async () => {
    const env = setup(); await env.runtime.enable(); env.playback.play();
    env.runtime.update({ ...env.settings, spatialMode: 'spatial' });
    expect(env.runtime.getSnapshot().spatialMode).toBe('spatial');
    expect(env.context.sources).toHaveLength(3);
    expect(env.context.spatials[2].positionX.value).toBe(.85);
    expect(env.context.spatials[2].positionZ.value).toBe(-5.5);
    expect(env.context.spatials.every(node => node.panningModel === 'equalpower' && node.rolloffFactor === 0)).toBe(true);
    env.runtime.dispose(); env.playback.dispose();
    const unavailable = new Context(); unavailable.spatialError = true;
    const fallback = setup(unavailable); await fallback.runtime.enable();
    fallback.runtime.update({ ...fallback.settings, spatialMode: 'spatial' });
    expect(fallback.runtime.getSnapshot().spatialMode).toBe('stereo-fallback');
    fallback.runtime.dispose(); fallback.playback.dispose();
  });
  it('discloses newly unsupported bindings on document updates without restarting sources', async () => {
    const env = setup(); await env.runtime.enable(); env.playback.play();
    const document = structuredClone(env.settings.document);
    document.bindings.push({ ...structuredClone(document.bindings[0]), id: 'ambiguous_tension' });
    env.runtime.update({ ...env.settings, document });
    expect(env.runtime.getSnapshot().message).toContain('ambiguous_tension');
    expect(env.runtime.getFrame().tracks[1].gainDb).toBe(-16);
    expect(env.context.sources).toHaveLength(3);
    env.runtime.dispose(); env.playback.dispose();
  });
});
