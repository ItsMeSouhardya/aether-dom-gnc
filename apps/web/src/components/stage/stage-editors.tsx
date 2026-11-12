'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CdomDocument, SvgAsset, SvgNode } from '@aether-dom/schema';
import { parseTransformDraft, transformKeys, type CommandOperation, type TransformDraft } from '../../features/commands/draft';
import { interpolateTransform, type Keyframe } from '../../features/stage/geometry';
import type { Playback } from '../../features/stage/playback';

type Layer = CdomDocument['layers'][number];
type Shot = CdomDocument['shots'][number];
export type StageEditorProps = { document: CdomDocument; run: (operation: CommandOperation, reason: string, expectedRevision?: number) => Promise<boolean>; busy: boolean; blocked: boolean };
const draftOf = (transform: Layer['transform']) => Object.fromEntries(transformKeys.map(key => [key, String(transform[key])])) as TransformDraft;
const numberValue = (text: string) => text.trim() && Number.isFinite(Number(text)) ? Number(text) : null;

function DraftNote({ revision }: { revision: number }) { return <p className="panel-note">Unsaved draft · Based on revision {revision}</p>; }
function Validation({ error }: { error: string }) { return error ? <p className="transform-validation" role="alert">{error}</p> : null; }

type CameraProps = StageEditorProps & { shot: Shot; onClose: () => void };
export function CameraEditor(props: CameraProps) { return <CameraDraft key={`${props.document.project.id}:${props.shot.id}`} {...props} />; }

function CameraDraft({ document, shot, run, busy, blocked, onClose }: CameraProps) {
  const [revision] = useState(document.project.revision);
  const [draft, setDraft] = useState(() => ({ x: String(shot.camera.position.x), y: String(shot.camera.position.y), z: String(shot.camera.position.z), fov: String(shot.camera.fovDeg) }));
  const [aspectRatio, setAspectRatio] = useState(shot.camera.aspectRatio);
  const [error, setError] = useState('');
  const disabled = busy || blocked;
  return <form className="lore-editor" aria-label="Edit camera" onSubmit={async event => {
    event.preventDefault(); if (disabled) return;
    const x = numberValue(draft.x), y = numberValue(draft.y), z = numberValue(draft.z), fovDeg = numberValue(draft.fov);
    if (x === null || y === null || z === null || fovDeg === null || Math.abs(x) > 1000 || Math.abs(y) > 1000 || z < .1 || z > 1000 || fovDeg < 1 || fovDeg > 120) { setError('Use finite X/Y within ±1000, Z from 0.1 to 1000, and FOV from 1° to 120°.'); return; }
    if (await run({ op: 'setShotCamera', targetId: shot.id, args: { camera: { position: { x, y, z }, fovDeg, aspectRatio } } }, 'Save shot camera', revision)) onClose();
  }}>
    <h3>Camera</h3><DraftNote revision={revision} />
    <div className="transform-draft-fields">{(['x', 'y', 'z', 'fov'] as const).map(key => <label key={key}>{key === 'fov' ? 'FOV (°)' : key.toUpperCase()}<input aria-label={`Camera ${key === 'fov' ? 'FOV' : key.toUpperCase()}`} type="number" step="any" required value={draft[key]} disabled={disabled} onChange={event => { setDraft(value => ({ ...value, [key]: event.target.value })); setError(''); }} /></label>)}</div>
    <label>Aspect ratio<select aria-label="Camera aspect ratio" value={aspectRatio} disabled={disabled} onChange={event => setAspectRatio(event.target.value as Shot['camera']['aspectRatio'])}><option>16:9</option><option>9:16</option><option>1:1</option></select></label>
    <Validation error={error} /><div className="transform-editor-actions"><button className="studio-button studio-primary" disabled={disabled}>Save camera</button><button className="studio-button" type="button" disabled={disabled} onClick={() => { setDraft({ x: '0', y: '0', z: '5', fov: '45' }); setAspectRatio('16:9'); setError(''); }}>Reset camera to 16:9</button><button className="studio-button" type="button" disabled={busy} onClick={onClose}>Cancel camera</button></div>
  </form>;
}

type ImportProps = StageEditorProps & { shotId: string; onClose: () => void };
export function SvgImport(props: ImportProps) { return <ImportDraft key={`${props.document.project.id}:${props.shotId}`} {...props} />; }

function ImportDraft({ document, shotId, run, busy, blocked, onClose }: ImportProps) {
  const [revision] = useState(document.project.revision);
  const [identities] = useState(() => ({ assetId: `asset_${crypto.randomUUID()}`, layerId: `layer_${crypto.randomUUID()}` }));
  const [source, setSource] = useState('');
  const [name, setName] = useState('');
  const [rights, setRights] = useState<'project_original' | 'licensed' | 'unknown'>('unknown');
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  const disabled = busy || blocked;
  return <form className="lore-editor" aria-label="Import SVG" onSubmit={async event => {
    event.preventDefault(); if (disabled || reading || !source) return;
    if (!name.trim()) { setError('Give the imported layer a name.'); return; }
    if (await run({ op: 'importSvgLayer', targetId: shotId, args: { ...identities, name: name.trim(), rights, svg: source } }, `Import SVG layer ${name.trim()}`, revision)) onClose();
  }}>
    <h3>Import SVG</h3><DraftNote revision={revision} /><p className="panel-note">Static SVG only · Up to 256 KiB. Source IDs and the safe original are preserved.</p>
    <label>SVG file<input aria-label="Import SVG file" type="file" accept=".svg,image/svg+xml" disabled={disabled} onChange={async event => {
      const file = event.target.files?.[0]; const token = ++generation.current;
      setSource(''); setError(''); setReading(false);
      if (!file) return;
      if (file.size > 256 * 1024) { setError('Choose an SVG file no larger than 256 KiB.'); return; }
      setName(Array.from(file.name.replace(/\.[^.]+$/, '')).slice(0, 80).join('') || 'Imported SVG'); setReading(true);
      try {
        const bytes = await file.arrayBuffer();
        if (token !== generation.current) return;
        const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
        if (!text.trim()) throw new Error('empty');
        setSource(text);
      } catch { if (token === generation.current) setError('The file must contain valid UTF-8 SVG text.'); }
      finally { if (token === generation.current) setReading(false); }
    }} /></label>
    <label>Layer name<input aria-label="Imported layer name" maxLength={80} required value={name} disabled={disabled} onChange={event => setName(event.target.value)} /></label>
    <label>Source rights<select aria-label="SVG source rights" value={rights} disabled={disabled} onChange={event => setRights(event.target.value as typeof rights)}><option value="unknown">Unknown</option><option value="project_original">Project original</option><option value="licensed">Licensed</option></select></label>
    {reading ? <p role="status">Reading SVG…</p> : null}<Validation error={error} />
    <div className="transform-editor-actions"><button className="studio-button studio-primary" disabled={disabled || reading || !source}>Import SVG layer</button><button className="studio-button" type="button" disabled={busy} onClick={onClose}>Cancel import</button></div>
  </form>;
}

const geometry: Record<SvgNode['tag'], string[]> = {
  svg: ['width', 'height'], g: [], path: ['d'], rect: ['x', 'y', 'width', 'height', 'rx', 'ry'], circle: ['cx', 'cy', 'r'], ellipse: ['cx', 'cy', 'rx', 'ry'], line: ['x1', 'y1', 'x2', 'y2'], polyline: ['points'], polygon: ['points'], text: ['x', 'y', 'dx', 'dy', 'font-size', 'font-family', 'font-weight', 'text-anchor', 'dominant-baseline', 'letter-spacing'],
};
const presentation = ['fill', 'stroke', 'stroke-width', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform'];
function flattenSvg(node: SvgNode): SvgNode[] { return [node, ...node.children.flatMap(flattenSvg)]; }

export function SvgEditor(props: StageEditorProps & { layer: Layer; svg: SvgAsset; selectedId: string | null; onSelect: (id: string) => void }) {
  const nodes = flattenSvg(props.svg.root);
  const selected = nodes.find(node => node.id === props.selectedId);
  const instances = props.document.layers.filter(layer => layer.assetId === props.layer.assetId).length;
  return <section className="lore-editor" aria-label="SVG element editor">
    <h3>SVG source</h3><p className="panel-note">Changes affect all layers using this asset ({instances} {instances === 1 ? 'instance' : 'instances'}). Original source and asset identity stay preserved.</p>
    <label>Element<select aria-label="SVG element" disabled={props.busy || props.blocked} value={selected?.id ?? ''} onChange={event => props.onSelect(event.target.value)}><option value="">Select an element</option>{nodes.map(node => <option key={node.id} value={node.id}>{node.id} · {node.tag}</option>)}</select></label>
    {selected ? <SvgElementDraft key={`${props.layer.id}:${props.svg.uri}:${selected.id}`} {...props} node={selected} /> : <p className="panel-note">Select a source element here or on the stage.</p>}
  </section>;
}

function SvgElementDraft({ document, layer, node, run, busy, blocked }: StageEditorProps & { layer: Layer; node: SvgNode }) {
  const [revision] = useState(document.project.revision);
  const fields = [...geometry[node.tag], ...presentation];
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(key => [key, node.attributes[key] ?? ''])));
  const [error, setError] = useState('');
  const changed = fields.filter(key => draft[key] !== (node.attributes[key] ?? ''));
  const disabled = busy || blocked;
  return <form aria-label="Edit SVG element" onSubmit={async event => {
    event.preventDefault(); if (disabled || !changed.length) return;
    if (changed.some(key => !draft[key].trim())) { setError('Attributes need a value. Use none to remove a fill or stroke.'); return; }
    setError('');
    await run({ op: 'editSvgElement', targetId: layer.assetId, args: { elementId: node.id, attributes: Object.fromEntries(changed.map(key => [key, draft[key]])) } }, `Edit SVG element ${node.id}`, revision);
  }}>
    <DraftNote revision={revision} /><div className="transform-draft-fields">{fields.map(key => <label key={key}>{key}<input aria-label={`SVG ${key}`} maxLength={key === 'd' || key === 'points' ? 65536 : 4096} value={draft[key]} disabled={disabled} onChange={event => { setDraft(previous => ({ ...previous, [key]: event.target.value })); setError(''); }} /></label>)}</div>
    <Validation error={error} /><div className="transform-editor-actions"><button className="studio-button studio-primary" disabled={disabled || !changed.length}>Save SVG changes</button></div>
  </form>;
}

type KeyframeProps = StageEditorProps & { layer: Layer; playback: Playback };
export function KeyframeEditor(props: KeyframeProps) { return <LayerKeyframes key={`${props.document.project.id}:${props.layer.id}`} {...props} />; }

function LayerKeyframes(props: KeyframeProps) {
  const { timeMs } = useSyncExternalStore(props.playback.subscribe, props.playback.getSnapshot, props.playback.getSnapshot);
  const [draft, setDraft] = useState<Keyframe | null>(null);
  const frames = [...(props.layer.keyframes ?? [])].sort((a, b) => a.timeMs - b.timeMs);
  const preview = interpolateTransform(props.layer, timeMs);
  const duration = props.document.shots.find(shot => shot.id === props.layer.shotId)?.durationMs ?? 0;
  const disabled = props.busy || props.blocked;
  return <section className="lore-editor" aria-label="Layer keyframes"><h3>Keyframes</h3>
    <dl className="transform-values">{transformKeys.map(key => <div key={key}><dt>{key === 'rotationDeg' ? 'Rotation' : key.toUpperCase()}</dt><dd><output aria-label={`Preview ${key === 'rotationDeg' ? 'rotation' : key.toUpperCase()}`} aria-live="off">{preview[key]}</output></dd></div>)}</dl>
    <p className="panel-note">Preview at {Math.round(timeMs)} ms. Saved base transforms remain independent.</p>
    {draft ? <KeyframeDraft key={draft.id} {...props} frame={draft} duration={duration} onClose={() => setDraft(null)} /> : <>
      <button className="studio-button" type="button" disabled={disabled || (frames.length >= 128 && !frames.some(frame => frame.timeMs === Math.round(timeMs)))} onClick={() => {
        props.playback.pause(); const time = Math.min(duration, Math.max(0, Math.round(props.playback.getSnapshot().timeMs)));
        setDraft(frames.find(frame => frame.timeMs === time) ?? { id: `keyframe_${crypto.randomUUID()}`, timeMs: time, transform: interpolateTransform(props.layer, time) });
      }}>Add keyframe</button>
      {frames.length ? <ul>{frames.map(frame => <li key={frame.id}><p className="panel-note">{frame.timeMs} ms · <code>{frame.id}</code></p><div className="transform-editor-actions"><button className="studio-button" type="button" disabled={disabled} onClick={() => { props.playback.pause(); setDraft(frame); }}>Update keyframe at {frame.timeMs} ms</button><DeleteKeyframe key={`${frame.id}:${props.document.project.revision}`} {...props} frame={frame} /></div></li>)}</ul> : <p className="panel-note">No authored keyframes. Add one at the playhead.</p>}
    </>}
  </section>;
}

function DeleteKeyframe({ document, layer, frame, run, busy, blocked }: StageEditorProps & { layer: Layer; frame: Keyframe }) {
  const [revision] = useState(document.project.revision);
  return <button className="studio-button" type="button" disabled={busy || blocked} onClick={() => { void run({ op: 'deleteLayerKeyframe', targetId: layer.id, args: { keyframeId: frame.id } }, `Delete keyframe at ${frame.timeMs} ms`, revision); }}>Delete keyframe at {frame.timeMs} ms</button>;
}

function KeyframeDraft({ document, layer, frame, duration, run, busy, blocked, onClose }: StageEditorProps & { layer: Layer; frame: Keyframe; duration: number; onClose: () => void }) {
  const [revision] = useState(document.project.revision);
  const [time, setTime] = useState(String(frame.timeMs));
  const [draft, setDraft] = useState(() => draftOf(frame.transform));
  const [error, setError] = useState('');
  const disabled = busy || blocked;
  return <form aria-label="Edit layer keyframe" onSubmit={async event => {
    event.preventDefault(); if (disabled) return;
    const timeMs = numberValue(time); const transform = parseTransformDraft(draft);
    if (timeMs === null || !Number.isSafeInteger(timeMs) || timeMs < 0 || timeMs > duration) { setError(`Use a whole time from 0 to ${duration} ms.`); return; }
    if (layer.keyframes?.some(keyframe => keyframe.timeMs === timeMs && keyframe.id !== frame.id)) { setError('A keyframe already exists at that time. Update it instead.'); return; }
    if (!transform.valid) { setError(transform.message); return; }
    if (await run({ op: 'setLayerKeyframe', targetId: layer.id, args: { keyframeId: frame.id, timeMs, transform: transform.transform } }, `Save keyframe at ${timeMs} ms`, revision)) onClose();
  }}>
    <DraftNote revision={revision} /><label>Time (ms)<input aria-label="Keyframe time" type="number" required min={0} max={duration} step={1} value={time} disabled={disabled} onChange={event => { setTime(event.target.value); setError(''); }} /></label>
    <div className="transform-draft-fields">{transformKeys.map(key => <label key={key}>{key === 'rotationDeg' ? 'Rotation (°)' : key.toUpperCase()}<input aria-label={`Keyframe ${key === 'rotationDeg' ? 'rotation' : key.toUpperCase()}`} type="number" step="any" required value={draft[key]} disabled={disabled} onChange={event => { setDraft(previous => ({ ...previous, [key]: event.target.value })); setError(''); }} /></label>)}</div>
    <Validation error={error} /><div className="transform-editor-actions"><button className="studio-button studio-primary" disabled={disabled}>Save keyframe</button><button className="studio-button" type="button" disabled={busy} onClick={onClose}>Cancel keyframe</button></div>
  </form>;
}

type AppearanceProps = StageEditorProps & { layer: Layer };
export function AppearanceEditor(props: AppearanceProps) { return <LayerAppearance key={`${props.document.project.id}:${props.layer.id}`} {...props} />; }

function LayerAppearance(props: AppearanceProps) {
  const [editing, setEditing] = useState(false);
  return <section className="lore-editor" aria-label="Layer appearance"><h3>Appearance</h3>
    {editing ? <AppearanceDraft {...props} onClose={() => setEditing(false)} /> : <><p className="panel-note">{props.layer.visible === false ? 'Hidden' : 'Visible'} · Opacity {props.layer.opacity ?? 1}</p><button className="studio-button" type="button" disabled={props.busy || props.blocked} onClick={() => setEditing(true)}>Edit appearance</button></>}
  </section>;
}

function AppearanceDraft({ document, layer, run, busy, blocked, onClose }: StageEditorProps & { layer: Layer; onClose: () => void }) {
  const [revision] = useState(document.project.revision);
  const [visible, setVisible] = useState(layer.visible !== false);
  const [opacity, setOpacity] = useState(String(layer.opacity ?? 1));
  const [error, setError] = useState('');
  const disabled = busy || blocked;
  return <form aria-label="Edit layer appearance" onSubmit={async event => {
    event.preventDefault(); if (disabled) return;
    const value = numberValue(opacity);
    if (value === null || value < 0 || value > 1) { setError('Opacity must be between 0 and 1.'); return; }
    if (await run({ op: 'setLayerAppearance', targetId: layer.id, args: { visible, opacity: value } }, 'Save layer appearance', revision)) onClose();
  }}>
    <DraftNote revision={revision} /><label>Visible<select aria-label="Layer visible" value={visible ? 'visible' : 'hidden'} disabled={disabled} onChange={event => setVisible(event.target.value === 'visible')}><option value="visible">Visible</option><option value="hidden">Hidden</option></select></label>
    <label>Opacity<input aria-label="Layer opacity" type="number" step="any" min={0} max={1} required value={opacity} disabled={disabled} onChange={event => { setOpacity(event.target.value); setError(''); }} /></label>
    <Validation error={error} /><div className="transform-editor-actions"><button className="studio-button studio-primary" disabled={disabled}>Save appearance</button><button className="studio-button" type="button" disabled={busy} onClick={onClose}>Cancel appearance</button></div>
  </form>;
}
