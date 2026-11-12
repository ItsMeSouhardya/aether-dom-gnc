import { useState } from 'react';
import type { CdomDocument } from '@aether-dom/schema';
import type { CommandOperation } from '@/features/commands/draft';
import { PoseEditor } from './pose-editor';
import { RecoveryEditor } from './recovery-editor';
import { DialectDraft } from './dialect-draft';

export function CharacterCanon({ document, character, layer, busy, blocked, run }: { document: CdomDocument; character: CdomDocument['characters'][number]; layer: CdomDocument['layers'][number]; busy: boolean; blocked: boolean; run: (operation: CommandOperation, reason: string, revision?: number) => Promise<boolean> }) {
  const [editingPose, setEditingPose] = useState(false);
  const [recoveryId, setRecoveryId] = useState<string | null>(null);
  const sceneId = document.shots.find(shot => shot.id === layer.shotId)?.sceneId ?? document.scenes[0]?.id ?? '';
  return <>
    <section className="inspector-section"><h3>Character</h3><p>{character.name}</p><p className="panel-note">{character.dialect.style}</p><dl className="reference-values"><div><dt>Pose</dt><dd><output aria-label="Saved pose">{layer.pose?.replaceAll('_', ' ') ?? 'Not specified'}</output></dd></div></dl>
      {editingPose ? <PoseEditor pose={layer.pose} revision={document.project.revision} busy={busy} blocked={blocked} cancel={() => setEditingPose(false)} save={(pose, revision) => run({ op: 'setLayerPose', targetId: layer.id, args: { pose } }, `Edit ${character.name} pose`, revision)} /> : <button className="studio-button transform-edit-button" disabled={busy || blocked} onClick={() => { setEditingPose(true); setRecoveryId(null); }}>Edit pose</button>}
    </section>
    {character.constraints.length ? <section className="inspector-section" aria-label="Physical canon"><h3>Physical canon</h3>{character.constraints.map(constraint => <div className="constraint-entry" key={constraint.id}><p>{constraint.limb.replaceAll('_', ' ')} · {constraint.type.replaceAll('_', ' ')}</p><code>{constraint.id}</code><p className="panel-note">Effective from <code>{constraint.effectiveFromEventId}</code></p>
      {constraint.resolvedByEventId ? <p className="panel-note">Recovery event <code>{constraint.resolvedByEventId}</code></p> : recoveryId === constraint.id ? <RecoveryEditor document={document} constraint={constraint} characterName={character.name} sceneId={sceneId} busy={busy} blocked={blocked} run={run} cancel={() => setRecoveryId(null)} /> : constraint.type === 'limb_injury' ? <button className="studio-button transform-edit-button" disabled={busy || blocked || !sceneId} onClick={() => { setRecoveryId(constraint.id); setEditingPose(false); }}>Review recovery</button> : null}
    </div>)}</section> : null}
    <DialectDraft character={character} />
  </>;
}
