import { afterEach, describe, expect, it, vi } from 'vitest';
import { playerFixture } from './player-fixture';
import { createWebMRecorder, type WebMNative } from '../src/features/export/record-webm';

const options = { shotId: 'shot_rooftop', aspect: '16:9' as const, durationMs: 100, includeAudio: false };

function setup() {
  vi.useFakeTimers();
  let now = 0;
  const track = { stop: vi.fn(), requestFrame: vi.fn() };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track], addTrack: vi.fn() };
  const draw = vi.fn();
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: draw }), captureStream: vi.fn(() => stream) };
  const urls = new Set<string>(); let nextUrl = 0;
  const recorder = {
    state: 'inactive', mimeType: 'video/webm', ondataavailable: null as ((event: { data: Blob }) => void) | null,
    onerror: null as (() => void) | null, onstop: null as (() => void) | null,
    start: vi.fn(() => { recorder.state = 'recording'; }),
    stop: vi.fn(() => { recorder.state = 'inactive'; recorder.ondataavailable?.({ data: new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])], { type: 'video/webm' }) }); recorder.onstop?.(); }),
  };
  const native = {
    createCanvas: () => canvas,
    createImage: () => { const image = { onload: null as (() => void) | null, onerror: null as (() => void) | null, set src(value: string) { if (value) queueMicrotask(() => image.onload?.()); } }; return image; },
    createRecorder: vi.fn(() => recorder), supports: () => true, now: () => now,
    createUrl: () => { const url = `blob:test-${nextUrl++}`; urls.add(url); return url; }, revokeUrl: (url: string) => urls.delete(url),
  } as unknown as WebMNative;
  const record = createWebMRecorder(native);
  return { record, native, track, stream, draw, recorder, urls, canvas, async advance(ms: number) { now += ms; await vi.advanceTimersByTimeAsync(ms); } };
}
afterEach(() => vi.useRealTimers());

describe('native bounded WebM recorder lifecycle', () => {
  it('records only canvas frames, returns WebM on completed stop and releases every resource', async () => {
    const env = setup(), progress = vi.fn();
    const result = env.record(playerFixture(), { ...options, onProgress: progress });
    await env.advance(0); expect(env.canvas.captureStream).toHaveBeenCalledWith(24);
    expect(env.track.requestFrame).toHaveBeenCalled();
    await env.advance(120);
    const blob = await result;
    expect(blob.type).toBe('video/webm'); expect(blob.size).toBeGreaterThan(0);
    expect(env.draw).toHaveBeenCalled(); expect(env.track.stop).toHaveBeenCalled();
    expect(env.urls.size).toBe(0); expect(progress).toHaveBeenLastCalledWith(1);
  });

  it('rejects cancellation without returning partial bytes and rejects concurrent recording', async () => {
    const env = setup(), controller = new AbortController();
    const result = env.record(playerFixture(), { ...options, signal: controller.signal });
    const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await env.advance(0);
    await expect(env.record(playerFixture(), options)).rejects.toThrow(/already/i);
    controller.abort(); await rejected;
    expect(env.track.stop).toHaveBeenCalled(); expect(env.urls.size).toBe(0);
  });

  it('rejects unsupported browsers and already aborted requests before native creation', async () => {
    const env = setup(); env.native.supports = () => false;
    await expect(env.record(playerFixture(), options)).rejects.toThrow(/WebM.*JSON/i);
    expect(env.native.createRecorder).not.toHaveBeenCalled();
    const controller = new AbortController(); controller.abort();
    await expect(env.record(playerFixture(), { ...options, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects recorder errors and output exceeding 64MiB with complete cleanup', async () => {
    const env = setup();
    const result = env.record(playerFixture(), options), rejected = expect(result).rejects.toThrow(/64.*MiB/i);
    await env.advance(0);
    env.recorder.ondataavailable?.({ data: { size: 64 * 1024 * 1024 + 1 } as Blob });
    await rejected; expect(env.track.stop).toHaveBeenCalled(); expect(env.urls.size).toBe(0);
    const again = env.record(playerFixture(), options), error = expect(again).rejects.toThrow(/encoding/i);
    await env.advance(0); env.recorder.onerror?.(); await error;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not keep an image URL or pending timer after abort during frame loading', async () => {
    const env = setup(), controller = new AbortController();
    env.native.createImage = () => ({ onload: null, onerror: null, src: '' }) as unknown as HTMLImageElement;
    const result = env.record(playerFixture(), { ...options, signal: controller.signal }), rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await env.advance(0); expect(env.urls.size).toBe(1);
    controller.abort(); await rejected;
    expect(env.urls.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels a pending native audio decode promptly and closes the gesture-owned context', async () => {
    const env = setup(), controller = new AbortController();
    const audio = { resume: vi.fn(async () => {}), close: vi.fn(async () => {}), decodeAudioData: vi.fn(() => new Promise(() => {})) };
    env.native.createAudioContext = () => audio as unknown as AudioContext;
    let failure: unknown;
    const result = env.record(playerFixture(), { ...options, includeAudio: true, signal: controller.signal }).catch(error => { failure = error; });
    expect(audio.resume).toHaveBeenCalledTimes(1);
    await env.advance(0); controller.abort(); await env.advance(0);
    expect(failure).toMatchObject({ name: 'AbortError' });
    await result; expect(audio.close).toHaveBeenCalled(); expect(env.urls.size).toBe(0);
  });

  it('releases its frame URL if native image construction fails', async () => {
    const env = setup(); env.native.createImage = () => { throw new Error('Image unavailable'); };
    await expect(env.record(playerFixture(), options)).rejects.toThrow('Image unavailable');
    expect(env.urls.size).toBe(0);
  });

  it('rejects a truncated recorder stop instead of publishing partial output', async () => {
    const env = setup();
    const recording = env.record(playerFixture(), options), failure = expect(recording).rejects.toThrow(/complete/i);
    await env.advance(0); env.recorder.stop(); await failure;
    expect(env.urls.size).toBe(0); expect(env.track.stop).toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps captured tracks alive until asynchronous final data and stop events have flushed', async () => {
    const env = setup();
    const audioTrack = { stop: vi.fn() };
    const destination = { stream: { getTracks: () => [audioTrack], getAudioTracks: () => [audioTrack] }, disconnect: vi.fn() };
    const node = () => ({ connect: vi.fn(), disconnect: vi.fn(), gain: { setValueAtTime: vi.fn() }, pan: { setValueAtTime: vi.fn() } });
    const audio = { currentTime: 0, resume: vi.fn(async () => {}), close: vi.fn(async () => {}),
      decodeAudioData: vi.fn(async (raw: ArrayBuffer) => ({ duration: new Uint8Array(raw)[0] === 0x1a ? .1 : 1, numberOfChannels: 1 })), createMediaStreamDestination: () => destination,
      createGain: node, createStereoPanner: node,
      createBufferSource: () => ({ ...node(), start: vi.fn(), stop: vi.fn() }),
    };
    env.native.createAudioContext = () => audio as unknown as AudioContext;
    env.recorder.stop.mockImplementation(() => { env.recorder.state = 'inactive'; });
    const recording = env.record(playerFixture(), { ...options, includeAudio: true });
    await env.advance(0); await env.advance(120);
    expect(env.recorder.stop).toHaveBeenCalledTimes(1);
    expect(audioTrack.stop).not.toHaveBeenCalled(); expect(env.track.stop).not.toHaveBeenCalled();
    env.recorder.ondataavailable?.({ data: new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])]) });
    env.recorder.onstop?.();
    await recording;
    expect(audioTrack.stop).toHaveBeenCalled(); expect(env.track.stop).toHaveBeenCalled(); expect(audio.close).toHaveBeenCalled();
  });

  it('rejects nonempty native output when its decoded audio is shorter than the authored clip', async () => {
    const env = setup();
    const audioTrack = { stop: vi.fn() };
    const destination = { stream: { getTracks: () => [audioTrack], getAudioTracks: () => [audioTrack] }, disconnect: vi.fn() };
    const node = () => ({ connect: vi.fn(), disconnect: vi.fn(), gain: { setValueAtTime: vi.fn() }, pan: { setValueAtTime: vi.fn() } });
    const audio = { currentTime: 0, resume: async () => {}, close: vi.fn(async () => {}),
      decodeAudioData: async (raw: ArrayBuffer) => ({ duration: new Uint8Array(raw)[0] === 0x1a ? .54 : 1, numberOfChannels: 2 }),
      createMediaStreamDestination: () => destination, createGain: node, createStereoPanner: node,
      createBufferSource: () => ({ ...node(), start: vi.fn(), stop: vi.fn() }),
    };
    env.native.createAudioContext = () => audio as unknown as AudioContext;
    let failure: unknown;
    const recording = env.record(playerFixture(), { ...options, durationMs: 1000, includeAudio: true }).catch(error => { failure = error; });
    await env.advance(1100); await recording;
    expect(failure).toBeInstanceOf(Error); expect((failure as Error).message).toMatch(/incomplete/i);
    expect(audio.close).toHaveBeenCalled(); expect(audioTrack.stop).toHaveBeenCalled();
  });
});
