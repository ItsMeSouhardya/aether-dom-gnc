import { afterEach, describe, expect, it, vi } from 'vitest';
import { playerFixture } from './player-fixture';
import { encodeWebCodecs, type WebCodecsNative } from '../src/features/export/webm-codecs';

afterEach(() => vi.restoreAllMocks());
const head = new Uint8Array([79,112,117,115,72,101,97,100,1,2,56,1,128,187,0,0,0,0,0]);
function setup() {
  const videoTimes: number[] = [], audioTimes: number[] = [], frameClose = vi.fn(), dataClose = vi.fn(), videoClose = vi.fn(), audioClose = vi.fn(), draw = vi.fn(async () => {}), mix = vi.fn(async () => ({ length: 4800, getChannelData: () => new Float32Array(4800) }));
  const chunk = (timestamp: number, duration: number) => ({ timestamp, duration, type: 'key', byteLength: 3, copyTo: (data: Uint8Array) => data.set([1,2,3]) });
  const canvas = { width: 0, height: 0 };
  const native = { createCanvas: () => canvas, draw, mix,
    videoSupport: async () => true, audioSupport: async () => true,
    videoEncoder: (init: VideoEncoderInit) => ({ state: 'configured', configure: vi.fn(), encode(frame: { timestamp: number }) { videoTimes.push(frame.timestamp); init.output(chunk(frame.timestamp,41667) as EncodedVideoChunk, {}); }, flush: async () => {}, close: videoClose }),
    audioEncoder: (init: AudioEncoderInit) => ({ state: 'configured', configure: vi.fn(), encode(data: { timestamp: number }) { audioTimes.push(data.timestamp); init.output(chunk(data.timestamp-6500,20000) as EncodedAudioChunk, { decoderConfig: { codec:'opus', sampleRate:48000, numberOfChannels:2, description:head } }); }, flush: async () => {}, close: audioClose }),
    videoFrame: (_canvas: HTMLCanvasElement, init: VideoFrameInit) => ({ timestamp: init.timestamp, close: frameClose }),
    audioData: (init: AudioDataInit) => ({ timestamp: init.timestamp, close: dataClose }),
  } as unknown as WebCodecsNative;
  return { native, canvas, videoTimes, audioTimes, frameClose, dataClose, videoClose, audioClose, draw, mix };
}
describe('bounded WebCodecs fallback', () => {
  it('encodes actual explicit frames and stereo Opus packets, then closes frames and codecs', async () => {
    const env = setup();
    const blob = await encodeWebCodecs(playerFixture(), { shotId:'shot_rooftop', aspect:'9:16', durationMs:100, includeAudio:true }, env.native);
    expect(blob.size).toBeGreaterThan(100); expect(env.videoTimes).toEqual([0,41667,83333]); expect(env.audioTimes).toEqual([0,20000,40000,60000,80000]);
    expect(env.frameClose).toHaveBeenCalledTimes(3); expect(env.dataClose).toHaveBeenCalledTimes(5); expect(env.videoClose).toHaveBeenCalled(); expect(env.audioClose).toHaveBeenCalled(); expect(env.canvas.width).toBe(0);
    expect(new TextDecoder().decode(await blob.arrayBuffer())).toContain('A_OPUS');
  });
  it('never silently drops requested audio and cleans up on cancellation', async () => {
    const env = setup(); env.native.audioSupport = async () => false;
    await expect(encodeWebCodecs(playerFixture(), { shotId:'shot_rooftop', aspect:'16:9', durationMs:100, includeAudio:true }, env.native)).rejects.toThrow(/audio|Opus/i);
    const controller = new AbortController(); controller.abort();
    await expect(encodeWebCodecs(playerFixture(), { shotId:'shot_rooftop', aspect:'16:9', durationMs:100, includeAudio:false,signal:controller.signal }, env.native)).rejects.toMatchObject({name:'AbortError'});
  });
  it('submits only actual remaining PCM samples for a non-packet-aligned clip', async () => {
    const env = setup(); env.mix.mockResolvedValue({length:5904,getChannelData:() => new Float32Array(5904)});
    const create = env.native.audioData; const inputs: AudioDataInit[] = [];
    env.native.audioData = init => { inputs.push(init); return create(init); };
    await encodeWebCodecs(playerFixture(), {shotId:'shot_rooftop',aspect:'9:16',durationMs:123,includeAudio:true},env.native);
    expect(inputs.map(input => input.numberOfFrames)).toEqual([960,960,960,960,960,960,144]);
  });
});
