'use client';
import { useState, useSyncExternalStore } from 'react';
import type { CdomDocument, RigBone } from '@aether-dom/schema';
import type { CommandOperation } from '@/features/commands/draft';
import type { Playback } from '@/features/stage/playback';
import type { RigPreview } from '@/features/stage/render-plan';
import { parseRigAngle } from '@/features/rig/draft';
import { RigPoseEditor, type RigDraft } from './rig-pose-editor';
import { instantiateRig } from '@/features/rig/template';
import { loadRigTemplate } from '@/lib/rig-template-api';

type Layer = CdomDocument['layers'][number];
type Props = { document: CdomDocument; layer: Layer | undefined; shotId: string | null; playback: Playback; busy: boolean; blocked: boolean; run: (operation: CommandOperation, reason: string, revision?: number) => Promise<boolean>; onPreview: (preview: (RigPreview & { revision: number }) | null) => void; onDirty: (dirty: boolean) => void };

export function RigPanel({ document, layer, shotId, playback, busy, blocked, run, onPreview, onDirty }: Props) {
  const [boneId, setBoneId] = useState('');
  const [draft, setDraft] = useState<RigDraft | null>(null);
  const [characterId, setCharacterId] = useState(document.characters.find(c => c.name.toLowerCase().includes('kael'))?.id ?? document.characters[0]?.id ?? '');
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const clock = useSyncExternalStore(playback.subscribe, playback.getSnapshot, playback.getSnapshot);
  const shot = document.shots.find(item => item.id === shotId);
  const bone = layer?.rig?.bones.find(item => item.id === boneId) ?? layer?.rig?.bones[0];
  const capturedLayer = document.layers.find(item => item.id === draft?.layerId);
  const targetValid = !!draft && !!capturedLayer?.rig?.bones.some(item => item.id === draft.bone.id) && draft.revision === document.project.revision;
  const disabled = busy || blocked || loading;
  const cancel = () => { setDraft(null); onDirty(false); onPreview(null); setError(''); };
  const start = (selected: RigBone, mode: RigDraft['mode'], frame?: NonNullable<RigBone['keyframes']>[number]) => {
    if (!layer || disabled || draft) return;
    playback.pause(); setError(''); onDirty(true);
    setDraft({ layerId: layer.id, bone: structuredClone(selected), revision: document.project.revision, angle: String(frame?.rotationDeg ?? selected.rotationDeg), action: selected.action ?? '', mode, time: String(frame?.timeMs ?? Math.round(clock.timeMs)), frameId: frame?.id ?? `frame_${crypto.randomUUID()}`, beforeFrame: frame ? { timeMs: frame.timeMs, rotationDeg: frame.rotationDeg } : null, review: false });
  };
  const changeAngle = (angle: string) => {
    if (!draft) return;
    setDraft({ ...draft, angle, review: false });
    const value = parseRigAngle(angle);
    onPreview(value === null || !targetValid ? null : { layerId: draft.layerId, boneId: draft.bone.id, rotationDeg: value, revision: draft.revision });
  };
  const add = async () => {
    if (!shot || !characterId || disabled || draft) return;
    const revision = document.project.revision, target = shot.id, character = characterId;
    setLoading(true); setError('');
    try { const template = await loadRigTemplate(); const data = instantiateRig(template, `rig_${crypto.randomUUID()}`); await run({ op: 'importRigLayer', targetId: target, args: { ...data, characterId: character, rights: 'project_original' } }, `Add original rig ${data.name}`, revision); }
    catch { setError('The original rig template could not be loaded. Check the local API and retry.'); }
    finally { setLoading(false); }
  };
  return <section className="inspector-section rig-panel" aria-label="Rig inspector">
    <h3>Rig</h3>
    {shot ? <><label>Character<select aria-label="Rig character" value={characterId} disabled={disabled || !!draft} onChange={event => setCharacterId(event.target.value)}>{document.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label><button className="studio-button" disabled={disabled || !!draft || !characterId} onClick={() => void add()}>{loading ? 'Loading rig…' : 'Add original rig'}</button></> : null}
    {layer?.rig ? <><p className="panel-note">Native SVG rig · {clock.timeMs.toFixed(0)} ms</p><label>Bone<select aria-label="Rig bone" value={bone?.id ?? ''} disabled={disabled || !!draft} onChange={event => setBoneId(event.target.value)}>{layer.rig.bones.map(item => <option key={item.id} value={item.id}>{item.parentId ? '↳ ' : ''}{item.name}</option>)}</select></label>
      <label>Attachment<select aria-label="Rig attachment" value="" disabled={disabled || !!draft} onChange={event => { const slot = layer.rig?.attachments.find(item => item.id === event.target.value); if (slot) setBoneId(slot.boneId); }}><option value="">Select attachment</option>{layer.rig.attachments.map(slot => <option key={slot.id} value={slot.id}>{slot.name}</option>)}</select></label>
      {bone ? <><p>{bone.name} · {bone.rotationDeg}° · {bone.limb ?? 'No limb'} · {bone.action ?? 'No action'}</p><button className="studio-button" disabled={disabled || !!draft} onClick={() => start(bone, 'pose')}>Edit bone pose</button><button className="studio-button" disabled={disabled || !!draft} onClick={() => start(bone, 'frame')}>Add bone frame</button>
        {(bone.keyframes ?? []).map(frame => <div key={frame.id}><button className="studio-button" onClick={() => playback.seek(frame.timeMs)}>{frame.timeMs} ms · {frame.rotationDeg}°</button><button className="studio-button" disabled={disabled || !!draft} onClick={() => start(bone, 'frame', frame)}>Edit frame</button><button className="studio-button" disabled={disabled || !!draft} onClick={() => start(bone, 'delete', frame)}>Delete frame</button></div>)}</> : null}</> : null}
    {draft ? <RigPoseEditor draft={draft} setDraft={setDraft} document={document} targetValid={targetValid} busy={busy} blocked={blocked} playback={playback} run={run} changeAngle={changeAngle} cancel={cancel} setError={setError} /> : null}
    {error ? <p role="alert">{error}</p> : null}
  </section>;
}
