import type { CdomDocument } from '@aether-dom/schema';
import type { SelectionAction, StudioSelection } from '@/features/studio/selection';
import { getSceneShots, kindLabel, layerName, stageLayers } from '@/features/studio/view-model';
import { Icon } from './icons';

type Props = { document: CdomDocument; selection: StudioSelection; dispatch: (action: SelectionAction) => void };

export function ProjectNavigator({ document, selection, dispatch }: Props) {
  const layers = stageLayers(document, selection.shotId).toReversed();
  return <aside className="studio-explorer" aria-label="Project explorer and nodes">
    <section className="project-explorer" aria-labelledby="project-explorer-heading">
      <div className="panel-heading"><h2 id="project-explorer-heading">Project</h2><Icon name="scene" /></div>
      <p className="project-file"><Icon name="asset" /><span>neon-shogun.cdom</span></p>
      <details className="explorer-group" open>
        <summary><Icon name="chevron" className="disclosure-icon" />Scenes<span>{document.scenes.length}</span></summary>
        {document.scenes.length === 0 ? <p className="panel-note">No scenes in this document.</p> : <ul className="project-tree">{document.scenes.map(scene => <li key={scene.id}>
          <button className="tree-node" aria-label={`Select scene ${scene.title}`} aria-pressed={selection.sceneId === scene.id} onClick={() => dispatch({ type: 'select-scene', id: scene.id })}><Icon name="scene" /><span>{scene.title}</span></button>
          {getSceneShots(document, scene.id).map(shot => <button className="tree-node tree-shot" key={shot.id} aria-label={`Select shot ${scene.title} (${shot.id})`} aria-pressed={selection.shotId === shot.id} onClick={() => dispatch({ type: 'select-shot', id: shot.id })}><Icon name="shot" /><span>{shot.id.replace(/^shot_/, '').replaceAll('_', ' ')}<small>{shot.durationMs / 1000}s</small></span></button>)}
        </li>)}</ul>}
      </details>
      <details className="explorer-group" open>
        <summary><Icon name="chevron" className="disclosure-icon" />Cast<span>{document.characters.length}</span></summary>
        {document.characters.length === 0 ? <p className="panel-note">No characters in this document.</p> : <ul className="reference-list">{document.characters.map(character => <li key={character.id}><Icon name="character" /><span>{character.name}</span></li>)}</ul>}
      </details>
      <details className="explorer-group">
        <summary><Icon name="chevron" className="disclosure-icon" />Asset references<span>{document.assets.length}</span></summary>
        <ul className="asset-reference-list">{document.assets.map(asset => <li key={asset.id}><Icon name="asset" /><span>{asset.uri.split('/').at(-1)}<small>{asset.kind} · Metadata only</small></span></li>)}</ul>
        {document.assets.length === 0 ? <p className="panel-note">No asset references recorded.</p> : null}
      </details>
    </section>
    <nav className="layer-navigator" aria-label="Layer navigator">
      <div className="panel-heading"><h2>Layers</h2><span>{layers.length}</span></div>
      {layers.length === 0 ? <p className="panel-note">{selection.shotId ? 'This shot has no layers.' : 'Select a shot to explore its layers.'}</p> : <ul className="layer-node-list">{layers.map(layer => <li key={layer.id}>
        <button aria-label={`Select layer ${layerName(document, layer)}`} aria-pressed={selection.layerId === layer.id} onClick={() => dispatch({ type: 'select-layer', id: layer.id })}>
          <Icon name={layer.characterId ? 'character' : 'layers'} /><span>{layerName(document, layer)}<small>{kindLabel(layer.kind)}</small></span><span className="layer-depth">{layer.transform.z}</span>
        </button>
      </li>)}</ul>}
      <p className="navigator-help">Select a layer to inspect its authored transform.</p>
    </nav>
  </aside>;
}
