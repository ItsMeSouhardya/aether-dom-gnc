import type { CdomDocument } from '@aether-dom/schema';
import type { SelectionAction, StudioSelection } from '@/features/studio/selection';
import { kindLabel, layerName, stageLayers, stagePlacement } from '@/features/studio/view-model';
import { Icon } from './icons';

type Props = { document: CdomDocument; selection: StudioSelection; dispatch: (action: SelectionAction) => void };

export function LayerStage({ document, selection, dispatch }: Props) {
  const shot = document.shots.find(shot => shot.id === selection.shotId);
  const scene = document.scenes.find(scene => scene.id === selection.sceneId);
  const layers = stageLayers(document, shot?.id ?? null);
  const ratio = shot ? { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1 }[shot.camera.aspectRatio] : 16 / 9;
  return <section className="studio-stage" aria-label="Layered stage" onKeyDown={event => { if (event.key === 'Escape') dispatch({ type: 'clear-layer' }); }}>
    <div className="stage-toolbar"><div><Icon name="layers" /><h2>{scene?.title ?? 'Stage'}</h2></div><span>{shot ? `${shot.camera.aspectRatio} · Layout blockout` : 'No shot selected'}</span></div>
    {shot ? <>
      <div className="stage-workspace">
        <div className="stage-canvas" style={{ aspectRatio: ratio, width: `min(100cqw, calc(100cqh * ${ratio}))` }} role="group" aria-label="Shot layout blockout">
          <div className="stage-safe-area" aria-hidden="true" />
          {layers.length === 0 ? <div className="stage-empty"><Icon name="layers" /><h3>No layers in this shot</h3><p>The layer navigator will list layers when the document contains them.</p></div> : layers.map((layer, index) => {
            const placement = stagePlacement(layer);
            const name = layerName(document, layer);
            return <button key={layer.id} className={`stage-layer ${layer.characterId ? 'stage-layer-character' : 'stage-layer-plane'} ${layer.transform.z <= -1 ? 'stage-layer-backdrop' : ''}`} aria-label={`Select stage layer ${name}`} aria-pressed={selection.layerId === layer.id}
              style={{ left: `${placement.left}%`, top: `${placement.top}%`, width: `${placement.width}%`, height: `${placement.height}%`, transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`, zIndex: index + 1 }}
              onClick={() => dispatch({ type: 'select-layer', id: layer.id })}>
              <span className="stage-layer-label"><Icon name={layer.characterId ? 'character' : 'layers'} /><strong>{name}</strong></span>
              <span className="stage-layer-type">{kindLabel(layer.kind)}</span>
              <span className="stage-layer-depth">z {layer.transform.z}</span>
            </button>;
          })}
        </div>
      </div>
      <div className="stage-caption"><span>{shot.id}</span><span>Selectable layout geometry · Source media not bundled</span></div>
    </> : <div className="stage-empty"><Icon name="shot" /><h3>{scene ? 'No shots in this scene' : 'No shot selected'}</h3><p>{scene ? 'Choose a scene with a shot in the project explorer.' : 'Choose a shot in the project explorer to view its layers.'}</p></div>}
  </section>;
}
