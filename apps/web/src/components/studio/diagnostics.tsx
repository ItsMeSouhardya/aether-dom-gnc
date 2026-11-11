import { useState } from 'react';
import { Icon } from './icons';

export function Diagnostics({ note }: { note: string }) {
  const [open, setOpen] = useState(false);
  return <section className="studio-diagnostics" aria-label="Diagnostics tray">
    <button className="diagnostics-toggle" aria-label="Diagnostics" aria-expanded={open} aria-controls="diagnostics-content" onClick={() => setOpen(value => !value)}><Icon name="chevron" /><strong>Diagnostics</strong><span>Continuity not run</span></button>
    <div id="diagnostics-content" hidden={!open} className="diagnostics-content"><p>Continuity checks are not enabled yet.</p><p className="panel-note">The snapshot passed structural validation. Story continuity and dependency checks arrive in Task 03.</p>{note ? <p className="document-note"><strong>Document note</strong>{note}</p> : null}</div>
  </section>;
}
