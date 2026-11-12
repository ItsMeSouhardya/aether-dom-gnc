import type { CdomDocument } from '@aether-dom/schema';
import type { Transform } from '../stage/geometry';

export type AudioUiSettings = {
  tensionPreview: number | null;
  masterGain: number;
  muted: boolean;
  spatialMode: 'headphones' | 'spatial';
  reactiveGlow: boolean;
};
export type AudioSettings = AudioUiSettings & { document: CdomDocument; shotId: string | null; animate: boolean };
export type AudioStatus = {
  state: 'off' | 'loading' | 'ready' | 'unsupported' | 'error';
  enabled: boolean;
  message: string;
  spatialMode: 'headphones' | 'spatial' | 'stereo-fallback';
};
export type AudioFrame = { level: number; tracks: { id: string; gainDb: number; pan: number }[] };
export type AudioPreview = {
  enable: () => Promise<void>;
  disable: () => void;
  update: (settings: AudioSettings) => void;
  setLayerDraft: (id: string, transform: Transform | null) => void;
  getSnapshot: () => AudioStatus;
  subscribe: (listener: () => void) => () => void;
  getFrame: () => AudioFrame;
  subscribeFrame: (listener: (frame: AudioFrame) => void) => () => void;
  dispose: () => void;
};
