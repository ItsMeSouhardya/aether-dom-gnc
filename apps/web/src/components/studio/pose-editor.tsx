import { useState } from 'react';

export function PoseEditor({ pose, revision, busy, blocked, save, cancel }: { pose: string | null; revision: number; busy: boolean; blocked: boolean; save: (pose: string | null, revision: number) => Promise<boolean>; cancel: () => void }) {
  const [draft, setDraft] = useState(pose ?? '');
  const [baseRevision] = useState(revision);
  const options = [['standing', 'Standing'], ['lifting_with_left_arm', 'Lifting with left arm'], ['lifting_with_right_arm', 'Lifting with right arm']];
  return <form className="lore-editor" aria-label="Edit layer pose" onSubmit={async event => { event.preventDefault(); if (await save(draft || null, baseRevision)) cancel(); }}>
    <p className="panel-note">Unsaved pose · Based on revision {baseRevision}</p>
    <label>Pose<select aria-label="Draft pose" value={draft} disabled={busy || blocked} onChange={event => setDraft(event.target.value)}><option value="">Not specified</option>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}{pose && !options.some(([value]) => value === pose) ? <option value={pose}>{pose.replaceAll('_', ' ')} (authored)</option> : null}</select></label>
    <div className="transform-editor-actions"><button className="studio-button studio-primary" disabled={busy || blocked || draft === (pose ?? '')}>{busy ? 'Saving…' : 'Save pose'}</button><button className="studio-button" type="button" disabled={busy} onClick={cancel}>Cancel pose edit</button></div>
  </form>;
}
