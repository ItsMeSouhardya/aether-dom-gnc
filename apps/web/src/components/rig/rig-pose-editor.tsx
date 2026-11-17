'use client';
import { useEffect, useRef } from 'react';
import type { CdomDocument, RigBone } from '@aether-dom/schema';
import type { CommandOperation } from '@/features/commands/draft';
import type { Playback } from '@/features/stage/playback';
import { parseRigAngle, parseRigTime } from '@/features/rig/draft';

export type RigDraft = { layerId: string; bone: RigBone; revision: number; angle: string; action: string; mode: 'pose' | 'frame' | 'delete'; time: string; frameId: string; beforeFrame: { timeMs: number; rotationDeg: number } | null; review: boolean };
type Props = { draft: RigDraft; setDraft: (value: RigDraft) => void; document: CdomDocument; targetValid: boolean; busy: boolean; blocked: boolean; playback: Playback; run: (operation: CommandOperation, reason: string, revision?: number) => Promise<boolean>; changeAngle: (angle: string) => void; cancel: () => void; setError: (error: string) => void };
export function RigPoseEditor({ draft, setDraft, document, targetValid, busy, blocked, playback, run, changeAngle, cancel, setError }: Props) {
  const layer = document.layers.find(item => item.id === draft.layerId);
  const duration = document.shots.find(item => item.id === layer?.shotId)?.durationMs ?? 0;
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    form.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus({ preventScroll: true });
    form.current?.scrollIntoView({ block: 'nearest' });
  }, [draft.layerId, draft.bone.id, draft.frameId, draft.mode]);
  return <form ref={form} className="lore-editor" aria-label="Rig draft" onSubmit={async event => {
    event.preventDefault(); if (busy || blocked || !targetValid) return;
    const angle = parseRigAngle(draft.angle), time = parseRigTime(draft.time, duration);
    if (angle === null || (draft.mode !== 'pose' && time === null) || Array.from(draft.action.trim()).length > 80) { setError('Use an angle from −360° to 360°, a whole time within the shot, and an action of at most 80 characters.'); return; }
    if (!draft.review) { setDraft({ ...draft, review: true }); setError(''); return; }
    const operation: CommandOperation = draft.mode === 'pose' ? { op: 'setRigBonePose', targetId: draft.bone.id, args: { rotationDeg: angle, action: draft.action.trim() || null } } : draft.mode === 'frame' ? { op: 'setRigBoneKeyframe', targetId: draft.bone.id, args: { keyframeId: draft.frameId, timeMs: time!, rotationDeg: angle } } : { op: 'deleteRigBoneKeyframe', targetId: draft.bone.id, args: { keyframeId: draft.frameId } };
    if (await run(operation, `${draft.mode === 'pose' ? 'Save bone pose' : draft.mode === 'frame' ? 'Save bone frame' : 'Delete bone frame'} ${draft.bone.name}`, draft.revision)) cancel();
  }}><h4>{draft.mode === 'pose' ? 'Edit pose' : draft.mode === 'frame' ? 'Edit bone frame' : 'Delete bone frame'} · {draft.bone.name}</h4><p className="panel-note">Draft based on revision {draft.revision}. Angle does not imply an action.</p>
    {!targetValid ? <p role="alert">The captured target or revision changed. Cancel this draft or reload to recover.</p> : null}
    <fieldset disabled={busy || blocked || !targetValid}><label>Angle (°)<input aria-label="Bone angle" value={draft.angle} onChange={event => changeAngle(event.target.value)} /></label>{draft.mode === 'pose' ? <label>Action<input aria-label="Bone action" value={draft.action} onChange={event => setDraft({ ...draft, action: event.target.value, review: false })} /></label> : <label>Time (ms)<input aria-label="Bone frame time" value={draft.time} onChange={event => { setDraft({ ...draft, time: event.target.value, review: false }); const value = parseRigTime(event.target.value, duration); if (value !== null) playback.seek(value); }} /></label>}
    {draft.review ? <p>{draft.mode === 'pose' ? `Review: ${draft.bone.rotationDeg}° → ${draft.angle}° · ${draft.bone.action ?? 'No action'} → ${draft.action || 'No action'}` : `Review: ${draft.beforeFrame ? `${draft.beforeFrame.timeMs} ms · ${draft.beforeFrame.rotationDeg}°` : 'No frame'} → ${draft.mode === 'delete' ? 'Delete frame' : `${draft.time} ms · ${draft.angle}°`}`}</p> : null}<button className="studio-button studio-primary">{draft.review ? 'Save rig change' : 'Review rig change'}</button></fieldset><button className="studio-button" type="button" disabled={busy} onClick={cancel}>Cancel rig draft</button></form>;
}
