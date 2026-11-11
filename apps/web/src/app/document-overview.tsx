'use client';

import { useEffect, useState } from 'react';
import type { CdomDocument } from '@aether-dom/schema';
import { loadSnapshot } from '@/lib/snapshot';

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; document: CdomDocument };

export default function DocumentOverview() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadSnapshot().then(
      document => { if (active) setState({ kind: 'ready', document }); },
      (error: unknown) => { if (active) setState({ kind: 'error', message: error instanceof Error ? error.message : 'Unable to load the document. Try again.' }); },
    );
    return () => { active = false; };
  }, [attempt]);

  function refresh() { setState({ kind: 'loading' }); setAttempt(value => value + 1); }

  if (state.kind !== 'ready') return <section className="connection-state" aria-busy={state.kind === 'loading'}>
    <h1>{state.kind === 'loading' ? 'Opening your document…' : 'Document unavailable'}</h1>
    <p role={state.kind === 'error' ? 'alert' : 'status'}>{state.kind === 'loading' ? 'Connecting to the local API and checking the .cdom contract.' : state.message}</p>
    <button className="action" disabled={state.kind === 'loading'} onClick={refresh}>{state.kind === 'loading' ? 'Loading document…' : 'Try again'}</button>
  </section>;

  const { document } = state;
  const branch = document.branches.find(branch => branch.id === document.project.activeBranchId);
  return <>
    <div className="document-toolbar">
      <p className="connection-label" role="status"><span className="connection-dot" aria-hidden="true" />Local API connected · Document validated</p>
      <button className="quiet-action" onClick={refresh}>Reload document<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 8a8 8 0 1 0 1 7M19 3v5h-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
    </div>
    <section className="document-intro" aria-labelledby="project-title">
      <h1 id="project-title">{document.project.title}</h1>
      <p>{document.project.description}</p>
      <dl className="document-meta">
        <div><dt>Branch</dt><dd>{branch?.name ?? 'Branch reference unavailable'}</dd></div>
        <div><dt>Revision</dt><dd>{document.project.revision}</dd></div>
        <div><dt>Document</dt><dd>.cdom {document.schemaVersion}</dd></div>
      </dl>
    </section>
    <div className="document-columns">
      <section aria-labelledby="story-heading" className="story-section">
        <div className="section-heading"><h2 id="story-heading">The story so far</h2><span>{document.scenes.length} scenes</span></div>
        {document.scenes.length === 0 ? <p>No scenes in this document.</p> : <ol className="scene-list">{document.scenes.map(scene => <li key={scene.id}>
          <h3>{scene.title}</h3>
          {scene.eventIds.length === 0 ? <p>No story events recorded.</p> : scene.eventIds.map(id => {
            const event = document.events.find(event => event.id === id);
            return <p key={id}>{event?.description ?? 'Event reference unavailable.'}</p>;
          })}
          <span className="scene-detail">{scene.shotIds.length === 0 ? 'No shots yet' : `${scene.shotIds.length} shot · ${document.shots.filter(shot => scene.shotIds.includes(shot.id)).reduce((total, shot) => total + shot.durationMs, 0) / 1000}s`}</span>
        </li>)}</ol>}
      </section>
      <aside aria-labelledby="cast-heading" className="cast-section">
        <div className="section-heading"><h2 id="cast-heading">Cast</h2><span>{document.characters.length} characters</span></div>
        {document.characters.length === 0 ? <p>No characters in this document.</p> : <ul className="cast-list">{document.characters.map(character => <li key={character.id}>
          <h3>{character.name}</h3><p>{character.dialect.style}</p>
          {character.constraints.length > 0 ? <p className="constraint">{character.constraints.map(constraint => constraint.limb.replaceAll('_', ' ')).join(', ')} · Constraint recorded</p> : null}
        </li>)}</ul>}
      </aside>
    </div>
    <section className="document-notes" aria-labelledby="foundation-heading">
      <div><h2 id="foundation-heading">A foundation for the connected story</h2><p>This fixture holds narrative, stage and audio data in one versioned document. Editing, rendering and playback arrive in later tasks.</p><p className="muted">Asset paths are metadata; media files are not bundled in this scaffold. The sample’s injured-arm contradiction is intentional and is not diagnosed by structural validation.</p></div>
      <a className="action" href="/api/v1/fixtures/neon-shogun" target="_blank" rel="noreferrer">View document JSON <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span className="sr-only"> (opens in a new tab)</span></a>
    </section>
  </>;
}
