import { useState } from 'react';
import type { CdomDocument } from '@aether-dom/schema';
import type { CommandOperation } from '@/features/commands/draft';

type Constraint = CdomDocument['characters'][number]['constraints'][number];
export function RecoveryEditor({ document, constraint, characterName, sceneId, busy, blocked, run, cancel }: { document: CdomDocument; constraint: Constraint; characterName: string; sceneId: string; busy: boolean; blocked: boolean; run: (operation: CommandOperation, reason: string, revision?: number) => Promise<boolean>; cancel: () => void }) {
  const [baseRevision] = useState(document.project.revision);
  const [eventId] = useState(() => `event_${crypto.randomUUID()}`);
  const [scene, setScene] = useState(sceneId);
  const [order, setOrder] = useState(String(document.events.reduce((max, event) => Math.max(max, event.order), -1) + 1));
  const [description, setDescription] = useState(`${characterName} recovers after treatment.`);
  const [error, setError] = useState('');
  return <form className="lore-editor recovery-editor" aria-label="Record constraint recovery" onSubmit={async event => {
    event.preventDefault(); const value = Number(order);
    const start = document.events.find(event => event.id === constraint.effectiveFromEventId);
    if (!order.trim() || !Number.isSafeInteger(value) || value < 0 || !start || value <= start.order || document.events.some(event => event.order === value)) { setError('Use an unused whole event order after the injury event.'); return; }
    if (!description.trim()) { setError('Describe how recovery becomes part of the story.'); return; }
    if (await run({ op: 'recordConstraintRecovery', targetId: constraint.id, args: { eventId, sceneId: scene, order: value, description } }, `Record recovery for ${characterName}`, baseRevision)) cancel();
  }}>
    <p className="panel-note">Review story change · Based on revision {baseRevision}</p><p>This recovery takes effect before this scene’s shots and at later event orders. Describe the recovery you intend to add to canon.</p>
    <label>Recovery scene<select aria-label="Recovery scene" value={scene} disabled={busy || blocked} onChange={event => setScene(event.target.value)}>{document.scenes.map(scene => <option key={scene.id} value={scene.id}>{scene.title}</option>)}</select></label>
    <label>Event order<input aria-label="Recovery event order" type="number" min="0" step="1" required value={order} disabled={busy || blocked} onChange={event => { setOrder(event.target.value); setError(''); }} /></label>
    <label>Recovery description<textarea aria-label="Recovery description" required maxLength={1000} value={description} disabled={busy || blocked} onChange={event => { setDescription(event.target.value); setError(''); }} /></label>
    <p className="panel-note">New event <code>{eventId}</code></p>{error ? <p className="transform-validation" role="alert">{error}</p> : null}
    <div className="transform-editor-actions"><button className="studio-button studio-primary" disabled={busy || blocked}>{busy ? 'Saving…' : 'Record recovery'}</button><button className="studio-button" type="button" disabled={busy} onClick={cancel}>Cancel recovery</button></div>
  </form>;
}
