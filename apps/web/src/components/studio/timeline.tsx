import type { CdomDocument } from '@aether-dom/schema';
import { getShotLayers, layerName } from '@/features/studio/view-model';

export function Timeline({ document, shotId }: { document: CdomDocument; shotId: string | null }) {
  const shot = document.shots.find(shot => shot.id === shotId);
  const layers = getShotLayers(document, shotId);
  return <section className="studio-timeline" aria-label="Timeline">
    <div className="timeline-header"><h2>Timeline</h2><span>{shot ? `${shot.durationMs / 1000}s` : 'No shot'} · Layout only</span></div>
    {shot ? <div className="timeline-layout"><div className="timeline-ruler"><span>Layers</span><div>{[0, 1, 2, 3, 4].map(step => <span key={step}>{(shot.durationMs / 4000 * step).toLocaleString('en', { maximumFractionDigits: 2 })}s</span>)}</div></div>
      {layers.map(layer => <div key={layer.id} className="timeline-track"><span>{layerName(document, layer)}</span><div className="timeline-track-lane"><span className="timeline-placeholder-bar">{layer.kind.replaceAll('_', ' ')}</span></div></div>)}
      {layers.length === 0 ? <p className="panel-note">No layer tracks in this shot.</p> : null}
    </div> : <p className="panel-note">Select a shot to see its duration and layer tracks.</p>}
    <p className="timeline-note">Track layout placeholder. Playback and keyframes are not enabled.</p>
  </section>;
}
