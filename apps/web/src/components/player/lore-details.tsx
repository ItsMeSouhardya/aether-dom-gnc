'use client';
import { useEffect, useRef } from 'react';
import { resolveHotspot, type CdomDocument, type LoreHotspot } from '@aether-dom/schema';

export function LoreDetails({ document, hotspot, close, localFile }: { document: CdomDocument; hotspot: LoreHotspot; close: () => void; localFile: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [hotspot.id]);
  const detail = resolveHotspot(document, hotspot);
  return <aside className="lore-details" aria-label="Lore details" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
    <div className="lore-details-heading"><h2 ref={heading} tabIndex={-1}>{hotspot.label}</h2><button className="player-button" onClick={close}>Close</button></div>
    <p>Saved revision {document.project.revision}</p>
    {detail.state === 'missing' ? <><p>Saved {detail.kind} target unavailable: {detail.targetId}</p><p>{localFile ? 'Open a corrected saved JSON file, or repair its source project in the studio that owns it and export again.' : 'Return to the studio to repair the saved source, then reopen the player.'}</p></> : <><h3>{detail.title}</h3>{detail.sections.map((section, index) => <section key={index}><h4>{section.heading}</h4><dl>{section.rows.map((row, i) => <div key={i}><dt>{row.label}</dt><dd>{row.text}</dd></div>)}</dl></section>)}<p>Evidence: {detail.evidenceIds.join(', ')}</p></>}
  </aside>;
}
