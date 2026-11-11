import type { CdomDocument } from '@aether-dom/schema';
import type { StudioSelection } from '@/features/studio/selection';
import { getShotLayers, kindLabel, layerName } from '@/features/studio/view-model';
import { Icon } from './icons';
import { useState } from 'react';
import type { Transform } from '@/features/commands/draft';
import { TransformEditor } from './transform-editor';

export function LayerInspector({ document, selection, clear, busy, blocked, save }: { document: CdomDocument; selection: StudioSelection; clear: () => void; busy: boolean; blocked: boolean; save: (targetId: string, transform: Transform, expectedRevision: number) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const layer = getShotLayers(document, selection.shotId).find(layer => layer.id === selection.layerId);
  const asset = document.assets.find(asset => asset.id === layer?.assetId);
  const character = document.characters.find(character => character.id === layer?.characterId);
  return <section className="studio-inspector" aria-label="Inspector">
    <div className="panel-heading"><h2>Inspector</h2><Icon name="inspect" /></div>
    {layer ? <div className="inspector-content">
      <div className="inspector-identity"><h3>{layerName(document, layer)}</h3><p>{kindLabel(layer.kind)}</p><code>{layer.id}</code></div>
      <section className="inspector-section" aria-labelledby="transform-heading"><div className="inspector-section-heading"><h3 id="transform-heading">Transform</h3><span>Saved values</span></div>
        <dl className="transform-values">
          <div><dt>X</dt><dd><output aria-label="X position" aria-live="off">{layer.transform.x}</output></dd></div>
          <div><dt>Y</dt><dd><output aria-label="Y position" aria-live="off">{layer.transform.y}</output></dd></div>
          <div><dt>Z</dt><dd><output aria-label="Z position" aria-live="off">{layer.transform.z}</output></dd></div>
          <div><dt>Scale</dt><dd><output aria-label="Scale" aria-live="off">{layer.transform.scale}</output></dd></div>
          <div><dt>Rotation</dt><dd><output aria-label="Rotation" aria-live="off">{layer.transform.rotationDeg}°</output></dd></div>
        </dl>
        {editing ? <TransformEditor transform={layer.transform} revision={document.project.revision} busy={busy} blocked={blocked} save={(value, revision) => save(layer.id, value, revision)} cancel={() => setEditing(false)} />
          : <button className="studio-button transform-edit-button" disabled={busy || blocked} onClick={() => setEditing(true)}>Edit transform</button>}
      </section>
      {character ? <section className="inspector-section"><h3>Character</h3><p>{character.name}</p><p className="panel-note">{character.dialect.style}</p><dl className="reference-values"><div><dt>Pose</dt><dd>{layer.pose?.replaceAll('_', ' ') ?? 'Not specified'}</dd></div></dl></section> : null}
      <section className="inspector-section"><h3>Source reference</h3><dl className="reference-values"><div><dt>Asset</dt><dd><code>{layer.assetId}</code></dd></div><div><dt>Path</dt><dd><code>{asset?.uri ?? 'Asset reference unavailable'}</code></dd></div><div><dt>Rights metadata</dt><dd>{asset?.rights.replaceAll('_', ' ') ?? 'Unavailable'}</dd></div></dl><p className="panel-note">Source file not bundled. The stage shows a layout block.</p></section>
      <button className="studio-button inspector-clear" onClick={clear}>Clear selection</button>
    </div> : <div className="inspector-empty"><Icon name="inspect" /><h3>Select a layer</h3><p>Choose a layer on the stage or in the navigator to inspect its transform and source references.</p><p>Selection is temporary. Your document stays unchanged.</p></div>}
  </section>;
}
