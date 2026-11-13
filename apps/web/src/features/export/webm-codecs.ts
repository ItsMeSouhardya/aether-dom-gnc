import { decodeManifestAudio, type PlayerManifest } from '@aether-dom/schema';
import { evaluateAudio } from '../audio/model';
import { abortable } from './abortable';
import { planWebM, webMFrame, WEBM_MAX_BYTES, type WebMOptions, type WebMPlan } from './webm-plan';
import { muxWebM, type WebMPacket } from './webm-muxer';
export type WebCodecsNative = {
  createCanvas: () => HTMLCanvasElement;
  draw: (canvas: HTMLCanvasElement, svg: string, signal: AbortSignal) => Promise<void>;
  mix: (manifest: PlayerManifest, plan: WebMPlan, signal: AbortSignal) => Promise<AudioBuffer>;
  videoSupport: (config: VideoEncoderConfig) => Promise<boolean>; audioSupport: (config: AudioEncoderConfig) => Promise<boolean>;
  videoEncoder: (init: VideoEncoderInit) => VideoEncoder; audioEncoder: (init: AudioEncoderInit) => AudioEncoder;
  videoFrame: (canvas: HTMLCanvasElement, init: VideoFrameInit) => VideoFrame; audioData: (init: AudioDataInit) => AudioData;
};

export async function renderWebMAudio(manifest: PlayerManifest, plan: WebMPlan, signal: AbortSignal, factory = (length: number) => new OfflineAudioContext(2,length,48000)): Promise<AudioBuffer> {
  signal.throwIfAborted();
  const context = factory(Math.ceil(plan.durationMs * 48)), nodes: AudioNode[] = [], sources: AudioBufferSourceNode[] = [];
  try {
    const tracks = evaluateAudio(plan.document,plan.shot.id,0,null,true).tracks;
    const decoded = await abortable(Promise.all(tracks.map(async track => {
      const asset = manifest.assets.find(asset => asset.assetId === track.assetId && asset.kind === 'audio');
      if (!asset || asset.kind !== 'audio') throw new Error('The fallback mix needs every embedded PCM audio source.');
      return { track, buffer: await context.decodeAudioData(decodeManifestAudio(asset.dataBase64)) };
    })),signal);
    signal.throwIfAborted();
    for (const { track,buffer } of decoded) {
      if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > 30 || buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2) throw new Error('The offline PCM source is outside supported limits.');
      const gain = context.createGain(), pan = context.createStereoPanner(), source = context.createBufferSource();
      nodes.push(gain,pan,source); sources.push(source); source.buffer = buffer; source.loop = true;
      source.connect(gain); gain.connect(pan); pan.connect(context.destination);
      for (let frame = 0; frame <= Math.ceil(plan.durationMs * 24 / 1000); frame++) {
        const timeMs = Math.min(plan.durationMs,frame * 1000 / 24);
        const current = evaluateAudio(plan.document,plan.shot.id,timeMs,null,true).tracks.find(current => current.id === track.id)!;
        gain.gain.setValueAtTime(.6 * 10 ** (current.gainDb / 20),timeMs / 1000); pan.pan.setValueAtTime(current.pan,timeMs / 1000);
      }
      source.start(0); source.stop(plan.durationMs / 1000);
    }
    return await abortable(context.startRendering(),signal);
  } finally { sources.forEach(source => { try { source.stop(); } catch { /* Rendering finished. */ } }); nodes.forEach(node => node.disconnect()); }
}

async function drawSvg(canvas: HTMLCanvasElement, svg: string, signal: AbortSignal) {
  const image = new Image(), url = URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try {
    await abortable(new Promise<void>((resolve,reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('The browser could not rasterize this SVG for fallback encoding.')); image.src = url; }),signal,10000);
    signal.throwIfAborted(); const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas drawing is unavailable for fallback encoding.');
    context.drawImage(image,0,0,canvas.width,canvas.height);
  } finally { image.onload = null; image.onerror = null; image.src = ''; URL.revokeObjectURL(url); }
}
const browser: WebCodecsNative = {
  createCanvas: () => document.createElement('canvas'), draw: drawSvg, mix: renderWebMAudio,
  videoSupport: async config => typeof VideoEncoder !== 'undefined' && (await VideoEncoder.isConfigSupported(config)).supported === true,
  audioSupport: async config => typeof AudioEncoder !== 'undefined' && typeof OfflineAudioContext !== 'undefined' && (await AudioEncoder.isConfigSupported(config)).supported === true,
  videoEncoder: init => new VideoEncoder(init), audioEncoder: init => new AudioEncoder(init),
  videoFrame: (canvas,init) => new VideoFrame(canvas,init), audioData: init => new AudioData(init),
};

/** Bounded software-frame fallback. WebCodecs timestamps use microseconds.
 * https://www.w3.org/TR/webcodecs/
 * https://www.w3.org/TR/webcodecs-opus-codec-registration/
 */
export async function encodeWebCodecs(manifest: PlayerManifest, options: WebMOptions, native: WebCodecsNative = browser): Promise<Blob> {
  const signal = options.signal ?? new AbortController().signal; signal.throwIfAborted();
  const plan = planWebM(manifest,options), hasAudio = options.includeAudio && plan.shot.audioTrackIds.length > 0;
  const videoConfig: VideoEncoderConfig = { codec:'vp8',width:plan.width,height:plan.height,bitrate:4000000,framerate:24,latencyMode:'realtime',hardwareAcceleration:'prefer-software' };
  const audioConfig: AudioEncoderConfig = { codec:'opus',sampleRate:48000,numberOfChannels:2,bitrate:128000 };
  if (!await abortable(native.videoSupport(videoConfig),signal)) throw new Error('This browser returned no recorder video and cannot encode VP8 frames. Export portable JSON instead.');
  if (hasAudio && !await abortable(native.audioSupport(audioConfig),signal)) throw new Error('This browser cannot encode the requested Opus audio. Turn off Include audio explicitly or export portable JSON.');
  let video: VideoEncoder | undefined, audio: AudioEncoder | undefined;
  const videoPackets: WebMPacket[] = [], audioPackets: WebMPacket[] = [];
  let opusHead: Uint8Array<ArrayBuffer> | undefined, bytes = 0, failure: Error | undefined;
  const canvas = native.createCanvas(); canvas.width = plan.width; canvas.height = plan.height;
  const collect = (packets: WebMPacket[], chunk: EncodedVideoChunk | EncodedAudioChunk) => {
    if (failure) return;
    bytes += chunk.byteLength;
    if (bytes > WEBM_MAX_BYTES - 65536) { failure = new Error('The recording exceeded 64 MiB. Choose a shorter clip.'); return; }
    const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data);
    packets.push({timestamp:chunk.timestamp,duration:chunk.duration ?? 41667,key:chunk.type === 'key',data});
  };
  const check = () => { signal.throwIfAborted(); if (failure) throw failure; };
  try {
    video = native.videoEncoder({output: chunk => collect(videoPackets,chunk),error: error => { failure = error; }}); video.configure(videoConfig);
    if (hasAudio) {
      audio = native.audioEncoder({output: (chunk,metadata) => {
        collect(audioPackets,chunk);
        const description = metadata?.decoderConfig?.description;
        if (description) opusHead = new Uint8Array(ArrayBuffer.isView(description) ? new Uint8Array(description.buffer,description.byteOffset,description.byteLength) : new Uint8Array(description));
      },error: error => { failure = error; }}); audio.configure(audioConfig);
      const mix = await native.mix(manifest,plan,signal); check();
      for (let offset = 0; offset < mix.length; offset += 960) {
        check();
        const count = Math.min(960,mix.length-offset), data = new Float32Array(count * 2);
        for (let channel = 0; channel < 2; channel++) data.set(mix.getChannelData(channel).subarray(offset,offset+count),channel*count);
        const input = native.audioData({format:'f32-planar',sampleRate:48000,numberOfFrames:count,numberOfChannels:2,timestamp:Math.round(offset / 48000 * 1000000),data});
        try { audio.encode(input); } finally { input.close(); }
      }
      await abortable(audio.flush(),signal); check();
      if (!opusHead) throw new Error('The Opus encoder did not provide its initialization header. Export portable JSON or turn off Include audio explicitly.');
    }
    const frames = Math.ceil(plan.durationMs * 24 / 1000);
    for (let index = 0; index < frames; index++) {
      check(); const timeMs = index * 1000 / 24;
      await native.draw(canvas,webMFrame(plan,timeMs),signal); check();
      const frame = native.videoFrame(canvas,{timestamp:Math.round(timeMs*1000),duration:Math.round(Math.min(1000/24,plan.durationMs-timeMs)*1000)});
      try { video.encode(frame,{keyFrame:index % 24 === 0}); } finally { frame.close(); }
      if (index % 4 === 0) await abortable(video.flush(),signal);
      options.onProgress?.((index+1)/frames * .99);
    }
    await abortable(video.flush(),signal); check();
    const blob = muxWebM({width:plan.width,height:plan.height,durationMs:plan.durationMs,video:videoPackets,...(hasAudio ? {audio:{description:opusHead!,packets:audioPackets}} : {})});
    options.onProgress?.(1); return blob;
  } finally { if (video?.state !== 'closed') video?.close(); if (audio?.state !== 'closed') audio?.close(); canvas.width = 0; canvas.height = 0; }
}
