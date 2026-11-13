import { describe, expect, it } from 'vitest';
import { muxWebM, type WebMPacket } from '../src/features/export/webm-muxer';

const video: WebMPacket[] = [{ timestamp: 0, duration: 41667, key: true, data: new Uint8Array([1, 2, 3]) }, { timestamp: 41667, duration: 41667, key: false, data: new Uint8Array([4]) }];
const head = new Uint8Array([79,112,117,115,72,101,97,100,1,2,56,1,128,187,0,0,0,0,0]);
function elements(bytes: Uint8Array): { id: number; data: Uint8Array }[] {
  const result: { id: number; data: Uint8Array }[] = []; let at = 0;
  while (at < bytes.length) {
    const read = (isId: boolean) => {
      const first = bytes[at++]; let length = 1, marker = 128;
      while (!(first & marker)) { marker >>= 1; length++; }
      let value = isId ? first : first & (marker - 1);
      for (let i = 1; i < length; i++) value = value * 256 + bytes[at++];
      return value;
    };
    const id = read(true), size = read(false); result.push({id,data:bytes.subarray(at,at+size)}); at += size;
  }
  return result;
}
describe('bounded VP8/Opus WebM container', () => {
  it('writes EBML WebM metadata, duration, real packet payloads and optional Opus initialization', async () => {
    const blob = muxWebM({ width: 720, height: 1280, durationMs: 100, video, audio: { description: head, packets: [{ timestamp: -6500, duration: 20000, key: true, data: new Uint8Array([9,8,7]) }] } });
    const bytes = new Uint8Array(await blob.arrayBuffer()), text = new TextDecoder().decode(bytes);
    expect([...bytes.slice(0,4)]).toEqual([0x1a,0x45,0xdf,0xa3]); expect(blob.type).toBe('video/webm');
    expect(text).toContain('webm'); expect(text).toContain('V_VP8'); expect(text).toContain('A_OPUS'); expect(text).toContain('OpusHead');
    expect([...bytes]).toEqual(expect.arrayContaining([9,8,7]));
    const segment = elements(elements(bytes).find(item => item.id === 0x18538067)!.data);
    const info = elements(segment.find(item => item.id === 0x1549a966)!.data), duration = info.find(item => item.id === 0x4489)!.data;
    expect(new DataView(duration.buffer,duration.byteOffset,duration.byteLength).getFloat64(0)).toBe(100);
    const entries = elements(segment.find(item => item.id === 0x1654ae6b)!.data).map(entry => elements(entry.data));
    const pixel = elements(entries[0].find(item => item.id === 0xe0)!.data);
    const unsigned = (data: Uint8Array) => [...data].reduce((value,byte) => value * 256 + byte,0);
    expect(pixel.map(item => unsigned(item.data))).toEqual([720,1280]);
    expect([...entries[1].find(item => item.id === 0x63a2)!.data]).toEqual([...head]);
    const blocks = elements(segment.find(item => item.id === 0x1f43b675)!.data).flatMap(item => item.id === 0xa3 ? [item] : item.id === 0xa0 ? elements(item.data).filter(item => item.id === 0xa1) : []).map(item => ({ track:item.data[0] & 127,time:item.data[1]*256+item.data[2],payload:[...item.data.slice(4)] }));
    expect(blocks).toEqual([{track:1,time:0,payload:[1,2,3]},{track:2,time:0,payload:[9,8,7]},{track:1,time:42,payload:[4]}]);
    const silent = new TextDecoder().decode(await muxWebM({ width: 1280, height: 720, durationMs: 100, video }).arrayBuffer());
    expect(silent).not.toContain('A_OPUS');
  });
  it('rejects invalid frames, missing audio initialization and excessive bounds', () => {
    for (const durationMs of [0, NaN, 30001]) expect(() => muxWebM({ width: 720, height: 1280, durationMs, video })).toThrow();
    expect(() => muxWebM({ width: 720, height: 1280, durationMs: 100, video: [] })).toThrow();
    expect(() => muxWebM({ width: 720, height: 1280, durationMs: 100, video, audio: { description: new Uint8Array(), packets: [] } })).toThrow(/Opus/i);
    expect(() => muxWebM({ width: 720, height: 1280, durationMs: 100, video: [{ ...video[0], timestamp: Infinity }] })).toThrow();
  });
  it('caps non-frame-aligned final video duration and trims padded Opus output at 123ms', async () => {
    const clip = [...video,{ timestamp:83333,duration:39667,key:false,data:new Uint8Array([5]) }];
    const blob = muxWebM({width:720,height:1280,durationMs:123,video:clip,audio:{description:head,packets:[{timestamp:-6500,duration:20000,key:true,data:new Uint8Array([7])},{timestamp:113500,duration:20000,key:true,data:new Uint8Array([8])}]}});
    const top = elements(new Uint8Array(await blob.arrayBuffer())), segment = elements(top.find(item => item.id === 0x18538067)!.data);
    const groups = elements(segment.find(item => item.id === 0x1f43b675)!.data).filter(item => item.id === 0xa0).map(item => elements(item.data));
    expect(groups).toHaveLength(2);
    const lastVideo = groups.find(group => (group.find(item => item.id === 0xa1)!.data[0] & 127) === 1)!;
    expect([...lastVideo.find(item => item.id === 0x9b)!.data]).toEqual([40]);
    const lastAudio = groups.find(group => (group.find(item => item.id === 0xa1)!.data[0] & 127) === 2)!;
    const padding = lastAudio.find(item => item.id === 0x75a2)!.data;
    expect(new DataView(padding.buffer,padding.byteOffset,padding.byteLength).getBigInt64(0)).toBe(10500000n);
  });
  it('subtracts actual pre-skip from raw Opus encoder flush padding', async () => {
    const blob = muxWebM({width:720,height:1280,durationMs:60,video,audio:{description:head,packets:[0,20000,40000,60000].map(timestamp => ({timestamp,duration:20000,key:true,data:new Uint8Array([7])}))}});
    const segment = elements(elements(new Uint8Array(await blob.arrayBuffer())).find(item => item.id === 0x18538067)!.data);
    const group = elements(segment.find(item => item.id === 0x1f43b675)!.data).filter(item => item.id === 0xa0).map(item => elements(item.data)).find(group => (group.find(item => item.id === 0xa1)!.data[0]&127) === 2)!;
    const padding = group.find(item => item.id === 0x75a2)!.data;
    expect(new DataView(padding.buffer,padding.byteOffset,padding.byteLength).getBigInt64(0)).toBe(13500000n);
  });
});
