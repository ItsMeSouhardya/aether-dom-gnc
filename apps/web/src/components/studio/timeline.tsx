'use client';
import { useState, useSyncExternalStore } from 'react';
import type { CdomDocument } from '@aether-dom/schema';
import { getShotLayers, layerName } from '@/features/studio/view-model';
import type { Playback } from '@/features/stage/playback';
import type { StageMode } from './layer-stage';

export function Timeline({ document, shotId, playback, mode, setMode, openAudio, audioOpen }: { document: CdomDocument; shotId: string | null; playback: Playback; mode: StageMode; setMode: (mode: StageMode) => void; openAudio: () => void; audioOpen: boolean }) {
  const shot = document.shots.find(shot => shot.id === shotId);
  const layers = getShotLayers(document, shotId);
  const preview = useSyncExternalStore(playback.subscribe, playback.getSnapshot, playback.getSnapshot);
  const [seekDraft, setSeekDraft] = useState<string | null>(null);
  const [tracks, setTracks] = useState({ mode, expanded: mode === 'animation' });
  const expanded = tracks.mode === mode ? tracks.expanded : mode === 'animation';
  return <section className="studio-timeline" aria-label="Timeline" data-expanded={expanded}>
    <div className="timeline-header"><div className="timeline-heading"><h2>Timeline</h2><button className="studio-button" aria-label={expanded ? 'Hide timeline tracks' : 'Show timeline tracks'} aria-expanded={expanded} aria-controls="timeline-tracks" onClick={() => setTracks({ mode, expanded: !expanded })}>{expanded ? 'Hide tracks' : 'Show tracks'}</button><button className="studio-button" aria-label="Audio mixer" aria-pressed={audioOpen} onClick={openAudio}>Audio</button></div>
      {shot ? <div className="timeline-controls"><button className="studio-button" aria-label={preview.playing ? 'Pause preview' : 'Play preview'} onClick={() => { setMode('animation'); if (preview.playing) playback.pause(); else playback.play(); }}>{preview.playing ? 'Pause' : 'Play'}</button>
        <label>Time <input aria-label="Seek time" type="number" min={0} max={shot.durationMs} step={1} value={seekDraft ?? Math.round(preview.timeMs)} onFocus={event => setSeekDraft(event.currentTarget.value)} onBlur={() => setSeekDraft(null)} onChange={event => {
          const value = event.target.value; setSeekDraft(value);
          if (value.trim() && Number.isFinite(Number(value))) { setMode('animation'); playback.seek(Number(value)); }
        }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /></label><span>/ {shot.durationMs / 1000}s</span></div> : <span>No shot</span>}</div>
    {shot ? <div id="timeline-tracks" className="timeline-layout"><div className="timeline-ruler"><span>Layers</span><div>{[0, 1, 2, 3, 4].map(step => <span key={step}>{(shot.durationMs / 4000 * step).toLocaleString('en', { maximumFractionDigits: 2 })}s</span>)}</div></div>
      {layers.map(layer => <div key={layer.id} className="timeline-track"><span>{layerName(document, layer)}</span><div className="timeline-track-lane">
        <span className="timeline-playhead" style={{ left: `${shot.durationMs ? preview.timeMs / shot.durationMs * 100 : 0}%` }} />
        {(layer.keyframes ?? []).map(frame => <button key={frame.id} className="timeline-keyframe" aria-label={`${layerName(document, layer)} keyframe at ${frame.timeMs} milliseconds`} style={{ left: `${frame.timeMs / shot.durationMs * 100}%` }} onClick={() => { setMode('animation'); playback.pause(); playback.seek(frame.timeMs); }} />)}
      </div></div>)}
      {layers.length === 0 ? <p className="panel-note">No layer tracks in this shot.</p> : null}
    </div> : <p className="panel-note">Select a shot to see its duration and layer tracks.</p>}
    <p className="timeline-note">{mode === 'animation' ? 'Linear interpolation · Preview does not change saved transforms' : 'Layout edits base transforms · Animate to author keyframes'}</p>
  </section>;
}
