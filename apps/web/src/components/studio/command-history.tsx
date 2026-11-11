import { useState } from 'react';
import type { CommandReceipt } from '@/lib/project-api';
import { Icon } from './icons';

export function CommandHistory({ entries }: { entries: CommandReceipt[] }) {
  const [open, setOpen] = useState(false);
  return <section className="studio-command-history" aria-label="Change history">
    <button className="diagnostics-toggle" aria-label="Change history" aria-expanded={open} aria-controls="change-history-content" onClick={() => setOpen(value => !value)}><Icon name="chevron" /><strong>Change history</strong><span>Saved locally</span></button>
    <div id="change-history-content" className="change-history-content" hidden={!open}>
      {entries.length === 0 ? <p className="panel-note">No changes saved yet. Edits and undo/redo actions will appear here.</p> : <><p className="panel-note">Most recent changes · newest first</p><ol>{entries.map(entry => <li key={entry.commandId}><span className="history-revision">r{entry.revision}</span><div><strong>{entry.reason}</strong><span>{entry.op} {entry.targetId ? `· ${entry.targetId}` : ''}</span></div><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></li>)}</ol></>}
    </div>
  </section>;
}
