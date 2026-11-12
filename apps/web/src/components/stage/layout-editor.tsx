'use client';
import { useEffect, useState } from 'react';
import type { CdomDocument } from '@aether-dom/schema';
import { parseTransformDraft, transformKeys, type CommandOperation, type TransformDraft } from '../../features/commands/draft';
import { fitSubjects, subjectSafety, type SourceBounds } from '../../features/stage/composition';
import type { Transform } from '../../features/stage/geometry';
import { layerName } from '../../features/studio/view-model';

export type LayoutPreview = { shotId: string; revision: number; layerTransforms: Record<string, Transform> | null };
type Props = { document: CdomDocument; shot: CdomDocument['shots'][number]; layerId: string | null; sources: SourceBounds; busy: boolean; blocked: boolean;
  run: (operation: CommandOperation, reason: string, revision?: number) => Promise<boolean>; onPreview: (draft: LayoutPreview | null) => void };
export function LayoutEditor(props: Props) {
  const [generation, reset] = useState(0);
  return <LayoutDraft key={`${props.shot.id}:${generation}`} {...props} reset={() => reset(value => value + 1)} />;
}
function LayoutDraft({ document, shot, layerId, sources, busy, blocked, run, onPreview, reset }: Props & { reset: () => void }) {
  const [revision] = useState(document.project.revision);
  const [initial] = useState(() => structuredClone(shot.layoutOverrides['9:16']?.layerTransforms ?? null));
  const [transforms, setTransforms] = useState<Record<string, Transform> | null>(initial);
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, TransformDraft>>({});
  const [error, setError] = useState('');
  useEffect(() => () => onPreview(null), [onPreview]);
  const layer = document.layers.find(layer => layer.id === layerId && layer.shotId === shot.id && shot.layerIds.includes(layer.id));
  const transform = layer ? transforms?.[layer.id] ?? layer.transform : null;
  const values = layer && transform ? fieldDrafts[layer.id] ?? Object.fromEntries(transformKeys.map(key => [key, String(transform[key])])) as TransformDraft : null;
  const changed = JSON.stringify(initial) !== JSON.stringify(transforms) || Object.keys(fieldDrafts).length > 0;
  const stale = revision !== document.project.revision;
  const disabled = busy || blocked || stale;
  const previewShot = { ...shot, layoutOverrides: { ...shot.layoutOverrides, '9:16': { layerTransforms: transforms ?? {} } } };
  const safety = subjectSafety(document.layers, previewShot, '9:16', sources);
  const fitReady = document.layers.filter(layer => layer.shotId === shot.id && shot.layerIds.includes(layer.id) && layer.kind === 'character_sprite' && layer.visible !== false && (layer.opacity ?? 1) > 0).every(layer => sources[layer.assetId]);
  const update = (next: Record<string, Transform> | null) => { setTransforms(next); setError(''); onPreview({ shotId: shot.id, revision, layerTransforms: next }); };
  return <section className="portrait-panel" aria-label="Portrait composition">
    <div className="panel-heading"><h2>Portrait composition</h2><span>9:16</span></div>
    <div className="inspector-content">
      <p className="panel-note">Alternate transforms only. Your base16:9 layout stays unchanged. Guides inset5% at the sides and10% at top/bottom; backgrounds may crop.</p>
      <p className="panel-note">{changed ? 'Unsaved draft' : 'Saved composition'} · Based on revision {revision}</p>
      {stale ? <p role="alert" className="transform-validation">This layout draft is stale. Reload the document before editing again.</p> : null}
      <section className="inspector-section"><h3>Subject safe area</h3>
        <p className="panel-note">Sprite bounds at time0. Keyframed movement can leave the safe area during playback.</p>
        {safety.length ? <ul className="subject-safety">{safety.map(item => <li key={item.id}><span>{layerName(document, document.layers.find(layer => layer.id === item.id)!)}</span><span>{item.status === 'safe' ? 'Inside safe area' : item.status === 'outside' ? 'Outside safe area' : 'Hidden or source unavailable'}</span></li>)}</ul> : <p className="panel-note">No character sprites in this shot. Select a layer to edit its portrait transform.</p>}
        <button className="studio-button" type="button" disabled={disabled || !fitReady || !safety.length} onClick={() => {
          const result = fitSubjects(document.layers, previewShot, '9:16', sources);
          if (!result.valid) { setError(result.message); return; }
          setFieldDrafts({}); update({ ...transforms, ...result.layerTransforms });
        }}>Fit subjects</button>
      </section>
      <form className="lore-editor" aria-label="Edit portrait layout" onSubmit={async event => {
        event.preventDefault(); if (disabled || !changed) return;
        let next = transforms;
        for (const [id, fields] of Object.entries(fieldDrafts)) {
          const parsed = parseTransformDraft(fields);
          if (!parsed.valid) { setError(parsed.message); return; }
          next = { ...next, [id]: parsed.transform };
        }
        if (await run({ op: 'setShotLayoutOverride', targetId: shot.id, args: { aspectRatio: '9:16', layerTransforms: next } }, 'Save portrait composition', revision)) { onPreview(null); reset(); }
      }}>
        {layer && values ? <><h3>{layerName(document, layer)} · Portrait transform</h3>
          <div className="transform-draft-fields">{transformKeys.map(key => <label key={key}>{key === 'rotationDeg' ? 'Rotation (°)' : key.toUpperCase()}<input aria-label={`Edit portrait ${key === 'rotationDeg' ? 'rotation' : key.toUpperCase()}`} type="number" step="any" required value={values[key]} disabled={disabled} onChange={event => {
            const fields = { ...values, [key]: event.target.value }; setFieldDrafts(previous => ({ ...previous, [layer.id]: fields })); setError('');
            const parsed = parseTransformDraft(fields); if (parsed.valid) update({ ...transforms, [layer.id]: parsed.transform });
          }} /></label>)}</div></> : <p className="panel-note">Select a layer on the stage or in Layers to edit its portrait values.</p>}
        {error ? <p className="transform-validation" role="alert">{error}</p> : null}
        <div className="transform-editor-actions"><button className="studio-button studio-primary" disabled={disabled || !changed}>Save portrait layout</button><button className="studio-button" type="button" disabled={busy || !changed} onClick={() => { onPreview(null); reset(); }}>Cancel layout</button></div>
        <button className="studio-button" type="button" disabled={disabled || transforms === null} onClick={() => { setFieldDrafts({}); update(null); }}>Use base transforms in portrait</button>
      </form>
    </div>
  </section>;
}
