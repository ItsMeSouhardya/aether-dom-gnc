import type { CommandReceipt } from '@/lib/project-api';
import { StudioDrawer } from './studio-drawer';

export function CommandHistory({ entries, open, toggle }: { entries: CommandReceipt[]; open: boolean; toggle: () => void }) {
  return <StudioDrawer id="change-history-content" title="Change history" summary="Saved locally" open={open} toggle={toggle}>
    <div className="change-history-content">
      {entries.length === 0 ? <p className="panel-note">No changes saved yet. Edits and undo/redo actions will appear here.</p> : <><p className="panel-note">Most recent changes · newest first</p><ol>{entries.map(entry => <li key={entry.commandId}><span className="history-revision">r{entry.revision}</span><div><strong>{entry.reason}</strong><span>{entry.op} {entry.targetId ? `· ${entry.targetId}` : ''}</span></div><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></li>)}</ol></>}
    </div>
  </StudioDrawer>;
}
