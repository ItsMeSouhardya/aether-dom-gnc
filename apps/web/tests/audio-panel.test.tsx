import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { CdomDocument } from '@aether-dom/schema';
import sample from '../../../packages/schema/fixtures/sample.cdom.json';
import { AudioPanel } from '../src/components/audio/audio-panel';
import type { AudioPreview, AudioStatus, AudioUiSettings } from '../src/features/audio/types';

const document = structuredClone(sample) as CdomDocument;
const settings: AudioUiSettings = { tensionPreview: null, masterGain: .6, muted: false, spatialMode: 'headphones', reactiveGlow: false };

function render(state: AudioStatus['state'] = 'off', shotId: string | null = document.shots[0].id) {
  const enable = vi.fn(async () => {});
  const status: AudioStatus = { state, enabled: state === 'ready' || state === 'loading', message: state === 'error' ? 'The local clip could not be decoded.' : 'Audio is off.', spatialMode: 'headphones' };
  const runtime: AudioPreview = { enable, disable: vi.fn(), update: vi.fn(), setLayerDraft: vi.fn(), getSnapshot: () => status, subscribe: () => () => {}, getFrame: () => ({ level: .25, tracks: [{ id: 'track_sign_foley', gainDb: -8, pan: -.5 }] }), subscribeFrame: () => () => {}, dispose: vi.fn() };
  const run = vi.fn(async () => true);
  return { markup: renderToStaticMarkup(createElement(AudioPanel, { document, shotId, runtime, settings, onSettingsChange: vi.fn(), run, busy: false, blocked: false, onClose: vi.fn() })), enable, run };
}

describe('audio mixer interface', () => {
  it('renders silent until an explicit gesture and exposes separate saved and preview controls', () => {
    const { markup, enable, run } = render();
    expect(enable).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(markup).toContain('aria-label="Audio mixer"');
    for (const label of ['Preview volume', 'Mute audio', 'Audio output mode', 'Reactive glow', 'Tension', 'Saved tension']) expect(markup).toContain(`aria-label="${label}"`);
    expect(markup).toContain('Enable audio');
    expect(markup).toContain('Save tension');
    expect(markup).toContain('Cancel tension');
    expect(markup).toContain('Preview controls are not saved');
  });

  it('identifies linked source IDs and gives finite initial runtime output without announcing every frame', () => {
    const { markup } = render('ready');
    expect(markup).toContain('Disable audio');
    expect(markup).toContain('track_sign_foley');
    expect(markup).toContain('asset_foley');
    expect(markup).toContain('layer_sign');
    expect(markup).toContain('aria-label="track_sign_foley gain dB" aria-live="off">-8.0');
    expect(markup).toContain('aria-label="track_sign_foley pan" aria-live="off">-0.50');
    expect(markup).toContain('aria-label="Audio level"');
  });

  it('offers recovery for clip failure and explains loading and unsupported browsers', () => {
    expect(render('error').markup).toContain('Retry audio');
    expect(render('error').markup).toContain('The local clip could not be decoded.');
    expect(render('loading').markup).toContain('Loading local audio');
    expect(render('unsupported').markup).toContain('Web Audio');
  });

  it('gives selection guidance when no shot is available and does not offer a dead save', () => {
    const { markup } = render('off', null);
    expect(markup).toContain('Choose a shot');
    expect(markup).not.toContain('Save tension');
  });
});
