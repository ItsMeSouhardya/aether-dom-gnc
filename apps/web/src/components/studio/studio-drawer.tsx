import type { ReactNode } from 'react';
import { Icon } from './icons';

export function StudioDrawer({ id, title, label = title, summary, open, toggle, children }: { id: string; title: string; label?: string; summary: string; open: boolean; toggle: () => void; children: ReactNode }) {
  return <section className="studio-analysis-drawer" aria-label={label}>
    <button className="diagnostics-toggle" aria-label={title} aria-expanded={open} aria-controls={id} onClick={toggle}><Icon name="chevron" /><strong>{title}</strong><span>{summary}</span></button>
    <div id={id} className="studio-drawer-content" hidden={!open}>{children}</div>
  </section>;
}
