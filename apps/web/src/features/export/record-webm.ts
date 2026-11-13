import type { PlayerManifest } from '@aether-dom/schema';
import { chooseWebMCodec, planWebM, WEBM_MAX_BYTES, webMFrame, type WebMOptions } from './webm-plan';
import { prepareWebMAudio } from './webm-audio';
import { abortable } from './abortable';
export type WebMNative = {
  createCanvas: () => HTMLCanvasElement; createImage: () => HTMLImageElement;
  createRecorder: (stream: MediaStream, options: MediaRecorderOptions) => MediaRecorder;
  supports: (type: string) => boolean; now: () => number;
  createUrl: (blob: Blob) => string; revokeUrl: (url: string) => void;
  createAudioContext?: () => AudioContext;
};
const aborted = () => new DOMException('Recording canceled. No partial file was saved.', 'AbortError');
export class EmptyWebMError extends Error {
  constructor() { super('The browser recorder returned no encoded video. Trying bounded local frame encoding.'); this.name = 'EmptyWebMError'; }
}
export class IncompleteWebMError extends EmptyWebMError {
  constructor() { super(); this.name = 'IncompleteWebMError'; this.message = 'The browser returned incomplete audio. Trying bounded local frame encoding.'; }
}

export function webMSupport(): { codec: string | null; message: string } {
  const codec = typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function'
    ? null : chooseWebMCodec(type => MediaRecorder.isTypeSupported(type));
  return { codec, message: codec ? `${codec} · 24fps · up to 720p` : 'WebM recording is unavailable in this browser. Try a current desktop Edge, Chrome or Firefox; portable JSON remains available in the studio.' };
}

/** The native boundary is injectable; all composition and lifecycle logic is shared. */
export function createWebMRecorder(native: WebMNative) {
  let active = false;
  return async (manifest: PlayerManifest, options: WebMOptions): Promise<Blob> => {
    if (active) throw new Error('A WebM recording is already running. Cancel it or wait for completion.');
    if (options.signal?.aborted) throw aborted();
    const plan = planWebM(manifest, options);
    const codec = chooseWebMCodec(native.supports);
    if (!codec) throw new Error('WebM encoding is unavailable. Use a current desktop browser or export portable JSON from the studio.');
    active = true;
    const controller = new AbortController(), signal = controller.signal;
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    let canvas: HTMLCanvasElement | null = null, stream: MediaStream | null = null, recorder: MediaRecorder | null = null;
    let audioContext: AudioContext | null = null;
    let frameTimer: ReturnType<typeof setTimeout> | undefined, endTimer: ReturnType<typeof setTimeout> | undefined, stopTimer: ReturnType<typeof setTimeout> | undefined;
    let stopAudio: (() => void) | undefined;
    try {
      canvas = native.createCanvas(); canvas.width = plan.width; canvas.height = plan.height;
      const context = canvas.getContext('2d');
      if (!context || typeof canvas.captureStream !== 'function') throw new Error('This browser cannot capture canvas video. Export portable JSON from the studio.');
      // AudioContext resume occurs synchronously in the Record gesture, before
      // image/audio decoding introduces an asynchronous boundary.
      const hasAudio = options.includeAudio && plan.shot.audioTrackIds.length > 0;
      let audioReady: Promise<Awaited<ReturnType<typeof prepareWebMAudio>>> | undefined;
      if (hasAudio) {
        if (!native.createAudioContext) throw new Error('Audio recording is unavailable. Turn off Include audio and retry.');
        audioContext = native.createAudioContext();
        const resumed = audioContext.resume();
        audioReady = prepareWebMAudio(manifest, plan, audioContext, signal, resumed).then(prepared => { stopAudio = prepared.dispose; return prepared; });
      }
      async function draw(timeMs: number) {
        signal.throwIfAborted();
        const image = native.createImage();
        const url = native.createUrl(new Blob([webMFrame(plan, timeMs)], { type: 'image/svg+xml' }));
        try {
          await new Promise<void>((resolve, reject) => {
            const finish = (error?: Error) => { clearTimeout(timeout); signal.removeEventListener('abort', cancel); image.onload = null; image.onerror = null; if (error) reject(error); else resolve(); };
            const cancel = () => finish(aborted());
            const timeout = setTimeout(() => finish(new Error('The browser could not render this SVG frame in time. Try a simpler saved shot.')), 10000);
            image.onload = () => finish(); image.onerror = () => finish(new Error('The browser could not render this embedded SVG frame. Export portable JSON instead.'));
            signal.addEventListener('abort', cancel, { once: true });
            if (signal.aborted) cancel(); else image.src = url;
          });
          signal.throwIfAborted(); context!.drawImage(image, 0, 0, plan.width, plan.height);
          // Explicitly deliver the authored frame even when repeated static
          // pixels do not trigger another automatic canvas capture.
          stream?.getVideoTracks().forEach(track => (track as CanvasCaptureMediaStreamTrack).requestFrame?.());
        } finally { image.onload = null; image.onerror = null; image.src = ''; native.revokeUrl(url); }
      }
      // Attach rejection handling before asynchronous frame preparation.
      const prepared = Promise.all([draw(0), audioReady]);
      const [, audio] = await prepared;
      stopAudio = audio?.dispose;
      signal.throwIfAborted();
      stream = canvas.captureStream(plan.fps);
      if (audio) audio.stream.getAudioTracks().forEach(track => stream!.addTrack(track));
      recorder = native.createRecorder(stream, { mimeType: codec, videoBitsPerSecond: 4000000, audioBitsPerSecond: 128000 });
      const current = recorder;
      const blob = await new Promise<Blob>((resolve, reject) => {
        const chunks: Blob[] = []; let bytes = 0, finished = false, completed = false;
        const clear = () => { clearTimeout(frameTimer); clearTimeout(endTimer); clearTimeout(stopTimer); signal.removeEventListener('abort', cancel); };
        const fail = (error: Error) => { if (finished) return; finished = true; chunks.length = 0; clear(); reject(error); };
        const cancel = () => fail(aborted());
        signal.addEventListener('abort', cancel, { once: true });
        current.ondataavailable = event => {
          if (finished || !event.data.size) return;
          bytes += event.data.size;
          if (bytes > WEBM_MAX_BYTES) fail(new Error('The recording exceeded 64 MiB. Choose a shorter clip.'));
          else chunks.push(event.data);
        };
        current.onerror = () => fail(new Error('Browser WebM encoding failed. Try a shorter clip or export portable JSON.'));
        current.onstop = () => {
          if (finished) return;
          if (!completed) { fail(new Error('The browser ended recording without a complete WebM file. Try recording again.')); return; }
          if (!bytes) { fail(new EmptyWebMError()); return; }
          finished = true; clear();
          resolve(new Blob(chunks, { type: 'video/webm' }));
        };
        try {
          current.start(250);
          const start = audio ? audio.start() : native.now();
          stream!.getVideoTracks().forEach(track => (track as CanvasCaptureMediaStreamTrack).requestFrame?.());
          const elapsed = () => Math.max(0, (audio ? audio.now() : native.now()) - start);
          options.onProgress?.(0);
          const tick = async () => {
            if (finished || completed) return;
            try {
              const time = Math.min(plan.durationMs, elapsed());
              audio?.update(time);
              await draw(time);
              if (finished || completed) return;
              options.onProgress?.(Math.min(.999, time / plan.durationMs));
              frameTimer = setTimeout(() => { void tick(); }, Math.max(0, 1000 / plan.fps - (elapsed() - time)));
            } catch (error) { if (!completed) fail(error instanceof Error ? error : new Error('Frame rendering failed.')); }
          };
          frameTimer = setTimeout(() => { void tick(); }, 1000 / plan.fps);
          endTimer = setTimeout(() => {
            if (finished) return;
            completed = true; clearTimeout(frameTimer);
            stopTimer = setTimeout(() => fail(new Error('The browser could not finish encoding the WebM file. Try recording again.')), 5000);
            // stop() queues final data/stop events. Keep destination and video
            // tracks alive until that asynchronous flush finishes; each audio
            // source already has its exact native clip-end stop scheduled.
            try { current.stop(); } catch { fail(new Error('The browser could not finish WebM encoding.')); }
          }, plan.durationMs);
        } catch (error) { fail(error instanceof Error ? error : new Error('WebM encoding could not start.')); }
      });
      signal.throwIfAborted();
      if (audioContext) {
        // Native encoders can emit nonempty output while dropping the start of
        // a captured audio stream. Verify the actual bytes before offering them.
        const decoder = audioContext;
        try {
          const decoded = await abortable(blob.arrayBuffer().then(bytes => decoder.decodeAudioData(bytes)), signal, 5000);
          if (!Number.isFinite(decoded.duration) || Math.abs(decoded.duration * 1000 - plan.durationMs) > 4) throw new IncompleteWebMError();
        } catch {
          signal.throwIfAborted();
          throw new IncompleteWebMError();
        }
      }
      signal.throwIfAborted(); options.onProgress?.(1); return blob;
    } finally {
      controller.abort();
      options.signal?.removeEventListener('abort', abort);
      clearTimeout(frameTimer); clearTimeout(endTimer); clearTimeout(stopTimer);
      if (recorder) { recorder.ondataavailable = null; recorder.onstop = null; recorder.onerror = null; if (recorder.state !== 'inactive') { try { recorder.stop(); } catch { /* Native failure must not prevent track cleanup. */ } } }
      stopAudio?.(); stream?.getTracks().forEach(track => track.stop());
      if (audioContext) { try { await audioContext.close(); } catch { /* Already closed or unsupported context. */ } }
      if (canvas) { canvas.width = 0; canvas.height = 0; }
      active = false;
    }
  };
}

const nativeRecord = createWebMRecorder({
  createCanvas: () => document.createElement('canvas'), createImage: () => new Image(),
  createRecorder: (stream, options) => new MediaRecorder(stream, options),
  supports: type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type), now: () => performance.now(),
  createUrl: blob => URL.createObjectURL(blob), revokeUrl: url => URL.revokeObjectURL(url),
  createAudioContext: () => { if (typeof AudioContext === 'undefined') throw new Error('Audio recording is unavailable. Turn off Include audio and retry.'); return new AudioContext(); },
});

let exporting = false;
export async function recordWebM(manifest: PlayerManifest, options: WebMOptions): Promise<Blob> {
  if (exporting) throw new Error('A WebM recording is already running. Cancel it or wait for completion.');
  exporting = true;
  try {
    try { return await nativeRecord(manifest,options); }
    catch (error) {
      if (!(error instanceof EmptyWebMError)) throw error;
      options.signal?.throwIfAborted();
      const { encodeWebCodecs } = await import('./webm-codecs');
      return await encodeWebCodecs(manifest,options);
    }
  } finally { exporting = false; }
}
