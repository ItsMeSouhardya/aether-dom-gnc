import { useId, useState } from 'react';
import { parseTransformDraft, transformKeys, type Transform, type TransformDraft } from '@/features/commands/draft';

const labels = { x: 'X position', y: 'Y position', z: 'Z position', scale: 'scale', rotationDeg: 'rotation' };
type Props = { transform: Transform; revision: number; busy: boolean; blocked: boolean; save: (value: Transform, expectedRevision: number) => Promise<boolean>; cancel: () => void };

export function TransformEditor({ transform, revision, busy, blocked, save, cancel }: Props) {
  const [draft, setDraft] = useState<TransformDraft>(() => Object.fromEntries(transformKeys.map(key => [key, String(transform[key])])) as TransformDraft);
  const [baseRevision] = useState(revision);
  const [error, setError] = useState<{ field: keyof Transform; message: string } | null>(null);
  const errorId = useId();
  const changed = transformKeys.some(key => draft[key] !== String(transform[key]));
  return <form className="transform-editor" aria-label="Edit layer transform" onSubmit={async event => {
    event.preventDefault();
    const parsed = parseTransformDraft(draft);
    if (!parsed.valid) { setError(parsed); return; }
    if (await save(parsed.transform, baseRevision)) cancel();
  }}>
    <p className="panel-note">Unsaved draft · Based on revision {baseRevision}</p>
    <div className="transform-draft-fields">{transformKeys.map(key => <label key={key}><span>{key === 'rotationDeg' ? 'Rotation (°)' : key.toUpperCase()}</span><input type="number" step="any" aria-label={`Edit ${labels[key]}`} value={draft[key]} disabled={busy || blocked}
      aria-invalid={error?.field === key || undefined} aria-describedby={error?.field === key ? errorId : undefined}
      onChange={event => { setDraft(value => ({ ...value, [key]: event.target.value })); setError(null); }} /></label>)}</div>
    {error ? <p role="alert" aria-label="Transform validation" id={errorId} className="transform-validation">{error.message}</p> : null}
    <div className="transform-editor-actions"><button className="studio-button studio-primary" type="submit" disabled={busy || blocked || !changed}>{busy ? 'Saving…' : 'Save transform'}</button><button className="studio-button" type="button" disabled={busy} aria-label="Cancel transform edit" onClick={cancel}>Cancel</button></div>
  </form>;
}
