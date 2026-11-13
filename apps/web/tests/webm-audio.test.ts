import { describe, expect, it, vi } from 'vitest';
import { playerFixture } from './player-fixture';
import { planWebM } from '../src/features/export/webm-plan';
import { prepareWebMAudio } from '../src/features/export/webm-audio';
import { renderWebMAudio } from '../src/features/export/webm-codecs';

class Node {
  connections: Node[] = []; disconnect = vi.fn(() => { this.connections = []; });
  connect(node: Node) { this.connections.push(node); return node; }
}
class Param { values: number[] = []; setValueAtTime(value: number) { this.values.push(value); } }
class Gain extends Node { gain = new Param(); }
class Pan extends Node { pan = new Param(); }
class Source extends Node { buffer = null; loop = false; start = vi.fn(); stop = vi.fn(); }
function setup() {
  const gains: Gain[] = [], pans: Pan[] = [], sources: Source[] = [];
  const destination = new Node(), track = { stop: vi.fn() }, streamNode = Object.assign(new Node(), { stream: { getTracks: () => [track] } });
  const context = { currentTime: 3, destination, decodeAudioData: vi.fn(async () => ({ duration: 1, numberOfChannels: 1 })),
    createGain: () => { const gain = new Gain(); gains.push(gain); return gain; },
    createStereoPanner: () => { const pan = new Pan(); pans.push(pan); return pan; },
    createMediaStreamDestination: () => streamNode,
    createBufferSource: () => { const source = new Source(); sources.push(source); return source; },
  };
  const manifest = playerFixture();
  manifest.document.schemaVersion = '0.2.0';
  const layer = manifest.document.layers.find(layer => layer.id === manifest.document.audioTracks.find(track => track.kind === 'foley')?.boundLayerId)!;
  layer.keyframes = [{ id: 'webm-pan-frame', timeMs: 1000, transform: { ...layer.transform, x: 2 } }];
  const plan = planWebM(manifest, { shotId: 'shot_rooftop', aspect: '9:16', durationMs: 1000, includeAudio: true });
  return { context, gains, pans, sources, destination, streamNode, track, manifest, plan };
}
describe('embedded-only recording mix', () => {
  it('routes authored gain/pan into the captured destination without speaker output, and stops sources at clip end', async () => {
    const env = setup();
    const mix = await prepareWebMAudio(env.manifest, env.plan, env.context as unknown as AudioContext, new AbortController().signal, Promise.resolve());
    expect(env.sources).toHaveLength(0);
    expect(mix.start()).toBe(3000);
    expect(env.sources.length).toBeGreaterThan(0);
    for (const source of env.sources) { expect(source.loop).toBe(true); expect(source.start).toHaveBeenCalledWith(3, 0); expect(source.stop).toHaveBeenCalledWith(4); }
    const pans = env.pans.map(pan => pan.pan.values.at(-1));
    env.context.currentTime = 3.5; mix.update(500);
    expect(env.pans.map(pan => pan.pan.values.at(-1))).not.toEqual(pans);
    expect([...env.gains, ...env.pans, ...env.sources].every(node => !node.connections.includes(env.destination))).toBe(true);
    mix.dispose(); mix.dispose();
    expect(env.track.stop).toHaveBeenCalled();
    expect([...env.gains, ...env.pans, ...env.sources].every(node => node.connections.length === 0)).toBe(true);
  });

  it('rejects decode failure and a canceled decode before creating a recording graph', async () => {
    const env = setup(); env.context.decodeAudioData.mockRejectedValueOnce(new Error('bad PCM'));
    await expect(prepareWebMAudio(env.manifest, env.plan, env.context as unknown as AudioContext, new AbortController().signal, Promise.resolve())).rejects.toThrow('bad PCM');
    expect(env.gains).toHaveLength(0);
    const controller = new AbortController(); controller.abort();
    await expect(prepareWebMAudio(env.manifest, env.plan, env.context as unknown as AudioContext, controller.signal, Promise.resolve())).rejects.toMatchObject({ name: 'AbortError' });
    expect(env.sources).toHaveLength(0);
  });

  it('renders the fallback stereo mix at explicit authored times into an offline destination', async () => {
    const env = setup(), buffer = { numberOfChannels:2, length:48000 } as AudioBuffer;
    env.context.currentTime = 0;
    const offline = { ...env.context, startRendering: vi.fn(async () => buffer) };
    const factory = vi.fn(() => offline as unknown as OfflineAudioContext);
    expect(await renderWebMAudio(env.manifest,env.plan,new AbortController().signal,factory)).toBe(buffer);
    expect(factory).toHaveBeenCalledWith(48000);
    for (const source of env.sources) { expect(source.start).toHaveBeenCalledWith(0); expect(source.stop).toHaveBeenCalledWith(1); }
    expect(env.pans.some(pan => new Set(pan.pan.values).size > 1)).toBe(true);
    expect(offline.startRendering).toHaveBeenCalledTimes(1);
    expect([...env.gains,...env.pans,...env.sources].every(node => node.connections.length === 0)).toBe(true);
  });
});
