'use client';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createAudioPreview } from './engine';
import type { Playback } from '../stage/playback';
import type { AudioFrame, AudioPreview, AudioSettings, AudioStatus, AudioUiSettings } from './types';

const off: AudioStatus = { state: 'off', enabled: false, message: 'Enable audio to hear this preview.', spatialMode: 'headphones' };
const silent: AudioFrame = { level: 0, tracks: [] };

/** A stable UI handle; effect replay replaces its disposable engine, not the handle. */
function audioSession(playback: Playback): AudioPreview {
  let engine: AudioPreview | null = null;
  let unsubStatus: (() => void) | null = null, unsubFrame: (() => void) | null = null;
  const listeners = new Set<() => void>(), frames = new Set<(frame: AudioFrame) => void>();
  const publish = () => { for (const listener of listeners) listener(); };
  return {
    enable: () => engine?.enable() ?? Promise.resolve(),
    disable: () => engine?.disable(),
    update(settings) {
      if (engine) { engine.update(settings); return; }
      engine = createAudioPreview(playback, settings);
      unsubStatus = engine.subscribe(publish);
      unsubFrame = engine.subscribeFrame(frame => { for (const listener of frames) listener(frame); });
      publish();
    },
    setLayerDraft: (id, transform) => engine?.setLayerDraft(id, transform),
    getSnapshot: () => engine?.getSnapshot() ?? off,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getFrame: () => engine?.getFrame() ?? silent,
    subscribeFrame(listener) { frames.add(listener); return () => { frames.delete(listener); }; },
    dispose() {
      unsubStatus?.(); unsubFrame?.(); unsubStatus = null; unsubFrame = null;
      engine?.dispose(); engine = null;
      for (const listener of frames) listener(silent);
      publish();
    },
  };
}

export function useAudioPreview(playback: Playback, settings: AudioSettings) {
  const runtime = useMemo(() => audioSession(playback), [playback]);
  useEffect(() => { runtime.update(settings); }, [runtime, settings]);
  useEffect(() => () => runtime.dispose(), [runtime]);
  return runtime;
}

const reducedSnapshot = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function subscribeReduced(listener: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)'); query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
export function useAudioSettings(): [AudioUiSettings, (patch: Partial<AudioUiSettings>) => void] {
  const reduced = useSyncExternalStore(subscribeReduced, reducedSnapshot, () => true);
  const [draft, setDraft] = useState({ tensionPreview: null as number | null, masterGain: .6, muted: false, spatialMode: 'headphones' as 'headphones' | 'spatial', reactiveGlow: null as boolean | null });
  const settings = useMemo(() => ({ ...draft, reactiveGlow: draft.reactiveGlow ?? !reduced }), [draft, reduced]);
  const update = useMemo(() => (patch: Partial<AudioUiSettings>) => setDraft(previous => ({ ...previous, ...patch })), []);
  return [settings, update];
}
