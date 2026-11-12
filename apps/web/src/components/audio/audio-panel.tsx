'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CdomDocument } from '@aether-dom/schema';
import type { CommandOperation } from '../../features/commands/draft';
import { initialTension } from '../../features/audio/model';
import type { AudioFrame, AudioPreview, AudioUiSettings } from '../../features/audio/types';

export type AudioPanelProps = {
  document: CdomDocument;
  shotId: string | null;
  runtime: AudioPreview;
  settings: AudioUiSettings;
  onSettingsChange: (patch: Partial<AudioUiSettings>) => void;
  busy: boolean;
  blocked: boolean;
  run: (operation: CommandOperation, reason: string, revision?: number) => Promise<boolean>;
  onClose: () => void;
};

const bounded = (value: number, min: number, max: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
const gainText = (value: number) => bounded(value, -80, 0).toFixed(1);
const panText = (value: number) => bounded(value, -1, 1).toFixed(2);

export function AudioPanel(props: AudioPanelProps) {
  return <Mixer key={`${props.document.project.id}:${props.document.project.activeBranchId}:${props.shotId}`} {...props} />;
}

function Mixer({ document, shotId, runtime, settings, onSettingsChange, busy, blocked, run, onClose }: AudioPanelProps) {
  const status = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot);
  const shot = document.shots.find(item => item.id === shotId);
  const tracks = shot?.audioTrackIds.map(id => ({ id, track: document.audioTracks.find(track => track.id === id && track.shotId === shot.id) })) ?? [];
  const hasTracks = tracks.some(item => item.track);
  const savedTension = initialTension(document, shotId);
  const [draft, setDraft] = useState<{ value: number; revision: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const draftRef = useRef(draft);
  const settingsCallback = useRef(onSettingsChange);
  useEffect(() => { settingsCallback.current = onSettingsChange; }, [onSettingsChange]);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (draftRef.current) settingsCallback.current({ tensionPreview: null });
    };
  }, []);

  const frame = runtime.getFrame();
  const meter = useRef<HTMLMeterElement>(null);
  const gainOutputs = useRef(new Map<string, HTMLOutputElement>());
  const panOutputs = useRef(new Map<string, HTMLOutputElement>());
  const trackIds = tracks.map(item => item.id).join('|');
  useEffect(() => {
    function draw(next: AudioFrame) {
      if (meter.current) meter.current.value = bounded(next.level, 0, 1);
      for (const [id, output] of gainOutputs.current) {
        const track = next.tracks.find(track => track.id === id);
        output.textContent = track ? gainText(track.gainDb) : '—';
      }
      for (const [id, output] of panOutputs.current) {
        const track = next.tracks.find(track => track.id === id);
        output.textContent = track ? panText(track.pan) : '—';
      }
    }
    draw(runtime.getFrame());
    return runtime.subscribeFrame(draw);
  }, [runtime, trackIds]);

  function cancelTension() {
    draftRef.current = null;
    setDraft(null);
    setError('');
    onSettingsChange({ tensionPreview: null });
  }

  async function enable() {
    setError('');
    try { await runtime.enable(); }
    catch { if (mounted.current) setError('Audio could not start. Retry audio to load the local clips again.'); }
  }

  const authoringDisabled = busy || blocked || saving;
  return <section className="inspector-section audio-panel" aria-label="Audio mixer">
    <div className="inspector-section-heading"><h2>Audio mixer</h2><button type="button" className="studio-button" disabled={saving} onClick={() => { cancelTension(); onClose(); }}>Close audio mixer</button></div>
    <p className="panel-note">Preview controls are not saved. Enable audio, then use Play in the timeline to listen. Choose Layout while playing to drag the linked prop and hear its pan; Escape cancels the move.</p>
    <p className="panel-note" role="status">{status.state === 'loading' ? 'Loading local audio…' : status.message}</p>
    {status.state === 'unsupported' ? <p className="panel-note">This browser cannot run Web Audio. Try a browser with Web Audio support, then retry.</p> : null}
    {error ? <p className="transform-validation" role="alert">{error}</p> : null}
    <div className="transform-editor-actions">
      {status.state !== 'ready' ? <button type="button" className="studio-button studio-primary" disabled={!hasTracks || status.state === 'loading'} onClick={() => { void enable(); }}>{status.state === 'error' || status.state === 'unsupported' ? 'Retry audio' : 'Enable audio'}</button> : null}
      {status.enabled ? <button type="button" className="studio-button" onClick={() => runtime.disable()}>Disable audio</button> : null}
    </div>
    {!shot ? <p className="panel-note">Choose a shot in the explorer to inspect its audio tracks and tension.</p> : !hasTracks ? <p className="panel-note">This shot has no available audio tracks. Choose a shot with linked local audio.</p> : null}
    {shot ? <form className="lore-editor" aria-label="Shot tension" onSubmit={async event => {
      event.preventDefault();
      if (!draft || authoringDisabled) return;
      const pending = draft;
      setSaving(true); setError('');
      try {
        const saved = await run({ op: 'setShotTension', targetId: shot.id, args: { tension: pending.value } }, 'Save shot tension', pending.revision);
        if (saved && mounted.current) cancelTension();
      } catch { if (mounted.current) setError('Tension was not saved. Keep this draft and reload the latest branch before retrying.'); }
      finally { if (mounted.current) setSaving(false); }
    }}>
      <h3>Shot tension</h3>
      <p className="panel-note">Saved tension <output aria-label="Saved tension">{savedTension.toFixed(2)}</output> · <code>{shot.id}</code></p>
      <label>Tension <output aria-label="Preview tension">{(draft?.value ?? savedTension).toFixed(2)}</output><input aria-label="Tension" type="range" min="0" max="1" step="0.01" value={draft?.value ?? savedTension} disabled={authoringDisabled} onChange={event => {
        const value = bounded(Number(event.target.value), 0, 1);
        const next = { value, revision: draftRef.current?.revision ?? document.project.revision };
        draftRef.current = next; setDraft(next); setError(''); onSettingsChange({ tensionPreview: value });
      }} /></label>
      <p className="panel-note">{draft ? `Unsaved draft · Based on revision ${draft.revision}` : 'Move the slider to preview a mix, then save tension to this shot.'}</p>
      {draft && draft.revision !== document.project.revision ? <p className="transform-validation" role="status">The saved branch changed. This draft still uses revision {draft.revision}; cancel it or reload latest before saving.</p> : null}
      {blocked ? <p className="panel-note">Saving is blocked. Reload latest to recover the saved branch.</p> : null}
      <div className="transform-editor-actions"><button className="studio-button studio-primary" disabled={!draft || authoringDisabled}>Save tension</button><button type="button" className="studio-button" disabled={!draft || saving} onClick={cancelTension}>Cancel tension</button></div>
    </form> : null}
    <div className="lore-editor audio-preview-controls">
      <h3>Preview mix</h3>
      <label>Preview volume <output>{Math.round(bounded(settings.masterGain, 0, 1) * 100)}%</output><input aria-label="Preview volume" type="range" min="0" max="1" step="0.01" value={settings.masterGain} onChange={event => onSettingsChange({ masterGain: Number(event.target.value) })} /></label>
      <label className="audio-toggle"><input aria-label="Mute audio" type="checkbox" checked={settings.muted} onChange={event => onSettingsChange({ muted: event.target.checked })} />Mute audio</label>
      <label>Audio output mode<select aria-label="Audio output mode" value={settings.spatialMode} onChange={event => onSettingsChange({ spatialMode: event.target.value as AudioUiSettings['spatialMode'] })}><option value="headphones">Headphones · stereo pan</option><option value="spatial">Spatial · equal-power position</option></select></label>
      <p className="panel-note">Headphones make left/right stereo pan easier to hear. Spatial mode uses the camera listener when supported.</p>
      {status.spatialMode === 'stereo-fallback' ? <p className="panel-note" role="status">Spatial audio is unavailable; using stereo pan.</p> : null}
      <label className="audio-toggle"><input aria-label="Reactive glow" type="checkbox" checked={settings.reactiveGlow} onChange={event => onSettingsChange({ reactiveGlow: event.target.checked })} />Reactive glow</label>
      <p className="panel-note">Optional runtime glow on the linked prop. Enabling it also permits glow with reduced motion.</p>
      <label>Audio level<meter ref={meter} aria-label="Audio level" aria-live="off" min="0" max="1" value={bounded(frame.level, 0, 1)} /></label>
    </div>
    <div className="lore-editor audio-linked-tracks"><h3>Linked tracks</h3>
      <p className="panel-note">Effective dB and pan follow timeline time. Pan −1 is left, 0 is center, +1 is right.</p>
      {tracks.length ? tracks.map(({ id, track }) => {
        const live = frame.tracks.find(item => item.id === id);
        return <div className="audio-track" key={id}><code>{id}</code>{track ? <><p className="panel-note">{track.kind} · <code>{track.assetId}</code>{track.boundLayerId ? <> · Bound to <code>{track.boundLayerId}</code></> : ' · Centered'}</p><dl className="reference-values"><div><dt>Gain (dB)</dt><dd><output ref={node => { if (node) gainOutputs.current.set(id, node); else gainOutputs.current.delete(id); }} aria-label={`${id} gain dB`} aria-live="off">{live ? gainText(live.gainDb) : '—'}</output></dd></div><div><dt>Pan</dt><dd><output ref={node => { if (node) panOutputs.current.set(id, node); else panOutputs.current.delete(id); }} aria-label={`${id} pan`} aria-live="off">{live ? panText(live.pan) : '—'}</output></dd></div></dl></> : <p className="panel-note">Track reference unavailable. Reload latest to check the saved shot.</p>}</div>;
      }) : <p className="panel-note">No audio track references in this shot.</p>}
    </div>
  </section>;
}
