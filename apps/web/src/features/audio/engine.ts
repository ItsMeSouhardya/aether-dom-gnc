import type { CdomDocument } from '@aether-dom/schema';
import { loadAudioAsset } from '../../lib/audio-asset-api';
import type { Transform } from '../stage/geometry';
import type { Playback } from '../stage/playback';
import { evaluateAudio, type DerivedAudioTrack } from './model';
import type { AudioFrame, AudioPreview, AudioSettings, AudioStatus } from './types';

export type AudioDependencies = {
  contextFactory?: () => AudioContext;
  loadAsset?: (document: CdomDocument, asset: { id: string; uri: string }, signal: AbortSignal) => Promise<ArrayBuffer>;
};
type Voice = {
  id: string; buffer: AudioBuffer; source: AudioBufferSourceNode | null;
  gain: GainNode; stereo: StereoPannerNode; spatial: PannerNode | null; route: 'headphones' | 'spatial';
};
const bounded = (value: number, min: number, max: number, fallback: number) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export function createAudioPreview(playback: Playback, initial: AudioSettings, dependencies: AudioDependencies = {}): AudioPreview {
  let settings = initial;
  let disposed = false;
  let generation = 0;
  let controller: AbortController | null = null;
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let analyser: AnalyserNode | null = null;
  let samples: Uint8Array<ArrayBuffer> | null = null;
  let voices: Voice[] = [];
  let loading: Promise<void> | null = null;
  let level = 0;
  let status: AudioStatus = { state: 'off', enabled: false, message: 'Enable audio to hear this preview.', spatialMode: initial.spatialMode };
  let frame: AudioFrame = { level: 0, tracks: [] };
  const listeners = new Set<() => void>();
  const frameListeners = new Set<(frame: AudioFrame) => void>();
  const drafts = new Map<string, Transform>();
  const loadAsset = dependencies.loadAsset ?? loadAudioAsset;

  function publishStatus(next: AudioStatus) {
    if (disposed || Object.keys(next).every(key => next[key as keyof AudioStatus] === status[key as keyof AudioStatus])) return;
    status = next;
    for (const listener of [...listeners]) listener();
  }
  function stopSources() {
    for (const voice of voices) {
      const source = voice.source; voice.source = null;
      if (source) { source.onended = null; try { source.stop(); } catch { /* A completed node may already be stopped. */ } source.disconnect(); }
    }
    level = 0;
  }
  function clearGraph() {
    stopSources();
    for (const voice of voices) { voice.gain.disconnect(); voice.stereo.disconnect(); voice.spatial?.disconnect(); }
    voices = [];
    master?.disconnect(); analyser?.disconnect();
    master = null; analyser = null; samples = null;
  }
  function cancelLoad() { generation++; controller?.abort(); controller = null; loading = null; }
  function closeContext() {
    const previous = context; context = null;
    if (previous) { try { void previous.close().catch(() => {}); } catch { /* Context may already be closed. */ } }
  }
  function smooth(param: AudioParam, value: number) {
    if (context && Number.isFinite(value)) param.setTargetAtTime(value, context.currentTime, .05);
  }
  function spatialMode(): AudioStatus['spatialMode'] {
    return settings.spatialMode === 'headphones' ? 'headphones' : voices.every(voice => voice.spatial !== null) ? 'spatial' : 'stereo-fallback';
  }
  function readyMessage() {
    const mix = evaluateAudio(settings.document, settings.shotId, playback.getSnapshot().timeMs);
    if (!mix.tracks.length) return 'This shot has no linked audio tracks.';
    return mix.coverage.unsupportedBindingIds.length ? `Ready. Unsupported bindings: ${mix.coverage.unsupportedBindingIds.join(', ')}.` : 'Ready. Play preview to hear the local mix.';
  }
  function applyTrack(voice: Voice, track: DerivedAudioTrack) {
    const spatial = settings.spatialMode === 'spatial' && voice.spatial !== null;
    const route = spatial ? 'spatial' : 'headphones';
    if (voice.route !== route) {
      voice.gain.disconnect();
      voice.gain.connect(spatial ? voice.spatial! : voice.stereo);
      voice.route = route;
    }
    smooth(voice.gain.gain, 10 ** (bounded(track.gainDb, -80, 0, -80) / 20));
    smooth(voice.stereo.pan, bounded(track.pan, -1, 1, 0));
    if (voice.spatial) {
      smooth(voice.spatial.positionX, bounded(track.position.x, -10000, 10000, 0));
      smooth(voice.spatial.positionY, bounded(track.position.y, -10000, 10000, 0));
      smooth(voice.spatial.positionZ, bounded(track.position.z, -10000, 10000, -1));
    }
  }
  function publishFrame() {
    if (disposed) return;
    const mix = evaluateAudio(settings.document, settings.shotId, playback.getSnapshot().timeMs, settings.tensionPreview, settings.animate, drafts);
    if (master) smooth(master.gain, settings.muted ? 0 : bounded(settings.masterGain, 0, 1, .6));
    for (const voice of voices) {
      const track = mix.tracks.find(candidate => candidate.id === voice.id);
      if (track) applyTrack(voice, track);
    }
    if (analyser && samples && voices.some(voice => voice.source !== null) && playback.getSnapshot().playing && status.state === 'ready' && !settings.muted) {
      analyser.getByteFrequencyData(samples);
      // Restrict the reactive signal to the lowest sixteen frequency bins.
      const count = Math.min(16, samples.length);
      let total = 0;
      for (let index = 0; index < count; index++) total += samples[index] / 255;
      const target = count ? total / count : 0;
      level += (target - level) * (target > level ? .45 : .15);
    } else level = 0;
    frame = { level: bounded(level, 0, 1, 0), tracks: mix.tracks.map(({ id, gainDb, pan }) => ({ id, gainDb, pan })) };
    for (const listener of [...frameListeners]) listener(frame);
  }
  function startSources() {
    stopSources();
    if (disposed || !context || status.state !== 'ready' || !playback.getSnapshot().playing) return;
    const when = context.currentTime;
    const offset = Math.max(0, playback.getSnapshot().timeMs / 1000);
    const duration = settings.document.shots.find(shot => shot.id === settings.shotId)?.durationMs;
    const remaining = typeof duration === 'number' && Number.isFinite(duration) ? Math.max(0, duration / 1000 - offset) : 0;
    if (remaining <= 0) return;
    for (const voice of voices) {
      const source = context.createBufferSource();
      voice.source = source;
      source.buffer = voice.buffer; source.loop = true;
      source.onended = () => {
        if (voice.source !== source) return;
        voice.source = null; source.onended = null; source.disconnect();
        if (!voices.some(candidate => candidate.source !== null)) publishFrame();
      };
      source.connect(voice.gain);
      source.start(when, offset % voice.buffer.duration);
      // Audio rendering continues when a background tab throttles visual RAF.
      source.stop(when + remaining);
    }
  }
  function fail(error: unknown) {
    cancelLoad(); clearGraph(); closeContext();
    publishStatus({ state: 'error', enabled: false, message: `Audio could not load. ${error instanceof Error ? error.message : 'Try enabling audio again.'}`, spatialMode: settings.spatialMode });
    publishFrame();
  }
  // Only asset topology changes reload buffers. Gain, tension, camera and layer
  // edits use the live graph, including when their canonical revision changes.
  function assetKey(value: AudioSettings) {
    const mix = evaluateAudio(value.document, value.shotId, 0);
    return JSON.stringify([value.document.project.id, value.document.project.activeBranchId, value.shotId, mix.tracks.map(track => [track.id, track.assetId, value.document.assets.find(asset => asset.id === track.assetId)?.uri])]);
  }
  function load(resumed: Promise<void> = Promise.resolve()): Promise<void> {
    cancelLoad(); clearGraph();
    const token = generation;
    const activeContext = context!;
    const document = settings.document;
    const mix = evaluateAudio(document, settings.shotId, playback.getSnapshot().timeMs);
    const abort = new AbortController(); controller = abort;
    publishStatus({ state: 'loading', enabled: true, message: 'Loading local audio…', spatialMode: settings.spatialMode });
    const current = () => !disposed && token === generation && context === activeContext && !abort.signal.aborted;
    const buffers = Promise.all(mix.tracks.map(async track => {
      const asset = document.assets.find(candidate => candidate.id === track.assetId && candidate.kind === 'audio');
      if (!asset) throw new Error(`Audio asset ${track.assetId} is unavailable.`);
      const bytes = await loadAsset(document, asset, abort.signal);
      if (!current()) return null;
      const buffer = await activeContext.decodeAudioData(bytes);
      if (!current()) return null;
      // decodeAudioData resamples to the context/device rate; the original
      // WAV's 8–48 kHz restriction belongs to the binary asset boundary.
      if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > 30 || buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2 || !Number.isFinite(buffer.sampleRate) || buffer.sampleRate <= 0) throw new Error('The decoded clip is outside the supported audio limits.');
      return { id: track.id, buffer };
    }));
    const operation = Promise.all([resumed, buffers]).then(([, decoded]) => {
      if (!current()) return;
      master = activeContext.createGain();
      // Set the initial master before connecting to avoid a default-gain burst.
      master.gain.setValueAtTime(settings.muted ? 0 : bounded(settings.masterGain, 0, 1, .6), activeContext.currentTime);
      analyser = activeContext.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .7;
      samples = new Uint8Array(analyser.frequencyBinCount);
      master.connect(analyser); analyser.connect(activeContext.destination);
      const listener = activeContext.listener;
      if (listener?.forwardZ) {
        listener.forwardX.setValueAtTime(0, activeContext.currentTime); listener.forwardY.setValueAtTime(0, activeContext.currentTime); listener.forwardZ.setValueAtTime(-1, activeContext.currentTime);
        listener.upX.setValueAtTime(0, activeContext.currentTime); listener.upY.setValueAtTime(1, activeContext.currentTime); listener.upZ.setValueAtTime(0, activeContext.currentTime);
      }
      for (const item of decoded) {
        if (!item) continue;
        const gain = activeContext.createGain(); const stereo = activeContext.createStereoPanner();
        gain.gain.setValueAtTime(0, activeContext.currentTime);
        let spatial: PannerNode | null = null;
        try { spatial = activeContext.createPanner(); spatial.panningModel = 'equalpower'; spatial.rolloffFactor = 0; spatial.connect(master); } catch { spatial?.disconnect(); spatial = null; }
        gain.connect(stereo); stereo.connect(master);
        voices.push({ ...item, source: null, gain, stereo, spatial, route: 'headphones' });
      }
      publishStatus({ state: 'ready', enabled: true, message: readyMessage(), spatialMode: spatialMode() });
      publishFrame(); startSources(); loading = null;
    }).catch(error => { if (current()) fail(error); });
    loading = operation;
    return operation;
  }
  const unsubscribe = playback.subscribe(publishFrame);
  const unsubscribeTransport = playback.subscribeTransport(event => {
    if (event.type === 'play' || event.type === 'seek') startSources();
    else stopSources();
    publishFrame();
  });
  publishFrame();
  return {
    enable() {
      if (disposed) return Promise.resolve();
      if (status.enabled) return loading ?? Promise.resolve();
      if (!dependencies.contextFactory && typeof AudioContext === 'undefined') {
        publishStatus({ state: 'unsupported', enabled: false, message: 'Web Audio is unavailable in this browser.', spatialMode: settings.spatialMode });
        return Promise.resolve();
      }
      try {
        context = dependencies.contextFactory ? dependencies.contextFactory() : new AudioContext();
        // Deliberately before any await: browser user activation belongs to this call.
        const resumed = context.resume();
        return load(resumed);
      } catch (error) { fail(error); return Promise.resolve(); }
    },
    disable() {
      if (disposed) return;
      cancelLoad(); clearGraph(); closeContext();
      publishStatus({ state: 'off', enabled: false, message: 'Enable audio to hear this preview.', spatialMode: settings.spatialMode });
      publishFrame();
    },
    update(next) {
      if (disposed) return;
      const reload = assetKey(settings) !== assetKey(next);
      settings = next;
      if (reload) { drafts.clear(); if (status.enabled && context) { void load(); return; } }
      publishFrame();
      if (status.state === 'ready') publishStatus({ ...status, message: readyMessage(), spatialMode: spatialMode() });
    },
    setLayerDraft(id, transform) { if (disposed) return; if (transform) drafts.set(id, { ...transform }); else drafts.delete(id); publishFrame(); },
    getSnapshot: () => status,
    subscribe(listener) { if (!disposed) listeners.add(listener); return () => { listeners.delete(listener); }; },
    getFrame: () => frame,
    subscribeFrame(listener) { if (!disposed) frameListeners.add(listener); return () => { frameListeners.delete(listener); }; },
    dispose() {
      if (disposed) return;
      cancelLoad(); clearGraph(); closeContext(); unsubscribe(); unsubscribeTransport();
      status = { state: 'off', enabled: false, message: 'Audio preview closed.', spatialMode: settings.spatialMode };
      frame = { level: 0, tracks: [] }; listeners.clear(); frameListeners.clear(); drafts.clear(); disposed = true;
    },
  };
}
