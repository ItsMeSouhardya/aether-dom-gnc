import { WEBM_MAX_BYTES } from './webm-plan';
export type WebMPacket = { timestamp: number; duration: number; key: boolean; data: Uint8Array<ArrayBuffer> };
export type MuxInput = { width: number; height: number; durationMs: number; video: WebMPacket[]; audio?: { description: Uint8Array<ArrayBuffer>; packets: WebMPacket[] } };
const text = (value: string) => new TextEncoder().encode(value);
function join(parts: Uint8Array<ArrayBuffer>[]) {
  const size = parts.reduce((total, part) => total + part.byteLength, 0);
  if (size > WEBM_MAX_BYTES) throw new Error('The recording exceeded 64 MiB. Choose a shorter clip.');
  const result = new Uint8Array(size); let position = 0;
  for (const part of parts) { result.set(part, position); position += part.byteLength; }
  return result;
}
function uint(value: number, length?: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid WebM integer.');
  let rest = BigInt(value); const values: number[] = [];
  do { values.unshift(Number(rest & 255n)); rest >>= 8n; } while (rest);
  while (length && values.length < length) values.unshift(0);
  return new Uint8Array(values);
}
function size(value: number) {
  for (let length = 1; length <= 8; length++) if (BigInt(value) < (1n << BigInt(length * 7)) - 1n) {
    let bits = BigInt(value) | (1n << BigInt(length * 7)); const result = new Uint8Array(length);
    for (let index = length - 1; index >= 0; index--) { result[index] = Number(bits & 255n); bits >>= 8n; }
    return result;
  }
  throw new Error('WebM element is too large.');
}
const element = (id: number, payload: Uint8Array<ArrayBuffer>) => join([uint(id), size(payload.length), payload]);
const number = (id: number, value: number) => element(id, uint(value));
const string = (id: number, value: string) => element(id, text(value));
const master = (id: number, children: Uint8Array<ArrayBuffer>[]) => element(id, join(children));
function float(id: number, value: number) { const bytes = new Uint8Array(8); new DataView(bytes.buffer).setFloat64(0, value); return element(id, bytes); }
function signed(id: number, value: number) { const bytes = new Uint8Array(8); new DataView(bytes.buffer).setBigInt64(0,BigInt(value)); return element(id,bytes); }

/** Minimal finite WebM, VP8 + Opus only. No untrusted arbitrary EBML input.
 * https://www.webmproject.org/docs/container/
 * https://www.matroska.org/technical/codec_specs.html#a_opus
 */
export function muxWebM(input: MuxInput): Blob {
  if (![[1280,720],[720,1280],[720,720]].some(([width,height]) => input.width === width && input.height === height) || !Number.isFinite(input.durationMs) || input.durationMs < 1 || input.durationMs > 30000 || !input.video.length || input.video.length > 720 || !input.video[0].key) throw new Error('Invalid bounded WebM frame plan.');
  const header = master(0x1a45dfa3, [number(0x4286,1),number(0x42f7,1),number(0x42f2,4),number(0x42f3,8),string(0x4282,'webm'),number(0x4287,4),number(0x4285,2)]);
  const info = master(0x1549a966,[number(0x2ad7b1,1000000),float(0x4489,input.durationMs),string(0x4d80,'AETHER-DOM'),string(0x5741,'AETHER-DOM')]);
  const tracks = [master(0xae,[number(0xd7,1),number(0x73c5,1),number(0x83,1),number(0x9c,0),string(0x86,'V_VP8'),number(0x23e383,41666667),master(0xe0,[number(0xb0,input.width),number(0xba,input.height)])])];
  let codecDelayUs = 0;
  if (input.audio) {
    const head = input.audio.description;
    if (head.length !== 19 || new TextDecoder().decode(head.subarray(0,8)) !== 'OpusHead' || head[8] !== 1 || head[9] !== 2 || head[18] !== 0 || !input.audio.packets.length || input.audio.packets.length > 1502) throw new Error('The Opus encoder did not return supported stereo OpusHead initialization.');
    const preSkip = new DataView(head.buffer, head.byteOffset, head.byteLength).getUint16(10,true);
    codecDelayUs = preSkip / 48000 * 1000000;
    tracks.push(master(0xae,[number(0xd7,2),number(0x73c5,2),number(0x83,2),number(0x9c,0),string(0x86,'A_OPUS'),element(0x63a2,head),number(0x56aa,Math.round(codecDelayUs * 1000)),number(0x56bb,80000000),master(0xe1,[float(0xb5,48000),number(0x9f,2)])]));
  }
  const audioOrigin = input.audio ? Math.min(...input.audio.packets.map(packet => packet.timestamp)) : 0;
  const packets = [...input.video.map(packet => ({ ...packet, track: 1, at: packet.timestamp })), ...(input.audio?.packets.map(packet => ({ ...packet, track: 2, at: packet.timestamp - audioOrigin })) ?? [])].sort((a,b) => a.at - b.at || a.track - b.track);
  let encodedBytes = 0;
  const lastVideoTimestamp = Math.max(...input.video.map(packet => packet.timestamp));
  const lastAudioTimestamp = input.audio ? Math.max(...input.audio.packets.map(packet => packet.timestamp)) : -Infinity;
  const blocks = packets.map(packet => {
    if (![packet.timestamp,packet.duration,packet.at].every(Number.isFinite) || packet.timestamp < -100000 || packet.at < -1000 || packet.at > (input.durationMs + 100) * 1000 || packet.duration <= 0 || !packet.data.length) throw new Error('Invalid WebM encoded packet timing.');
    encodedBytes += packet.data.length;
    if (encodedBytes > WEBM_MAX_BYTES - 65536) throw new Error('The recording exceeded 64 MiB. Choose a shorter clip.');
    const time = Math.max(0,Math.round(packet.at / 1000));
    if (time > 32767) throw new Error('WebM packet timestamp exceeds the bounded cluster.');
    const blockHeader = new Uint8Array([0x80 | packet.track, time >> 8, time & 255, packet.key ? 0x80 : 0]);
    if (packet.track === 1 && packet.timestamp === lastVideoTimestamp) {
      blockHeader[3] = 0;
      const previous = input.video.filter(candidate => candidate.timestamp < packet.timestamp).at(-1);
      return master(0xa0,[element(0xa1,join([blockHeader,packet.data])),number(0x9b,Math.max(1,Math.round(input.durationMs-time))),...(!packet.key && previous ? [signed(0xfb,Math.round(previous.timestamp / 1000)-time)] : [])]);
    }
    if (packet.track === 2 && packet.timestamp === lastAudioTimestamp) {
      blockHeader[3] = 0;
      // CodecDelay/pre-skip removes priming at the beginning; only the remaining
      // decoded tail beyond the requested clip belongs in DiscardPadding.
      const paddingNs = Math.max(0,Math.round((packet.at+packet.duration-codecDelayUs-input.durationMs*1000)*1000));
      return master(0xa0,[element(0xa1,join([blockHeader,packet.data])),number(0x9b,Math.max(1,Math.round(packet.duration/1000))),...(paddingNs ? [signed(0x75a2,paddingNs)] : [])]);
    }
    return element(0xa3,join([blockHeader,packet.data]));
  });
  const segment = master(0x18538067,[info,master(0x1654ae6b,tracks),master(0x1f43b675,[number(0xe7,0),...blocks])]);
  return new Blob([header,segment],{type:'video/webm'});
}
