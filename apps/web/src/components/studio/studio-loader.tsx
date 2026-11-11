'use client';

import { useEffect, useState } from 'react';
import type { CdomDocument } from '@aether-dom/schema';
import { loadSnapshot } from '@/lib/snapshot';
import { StudioShell } from './studio-shell';
import { Icon } from './icons';

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; document: CdomDocument };

export default function StudioLoader() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    loadSnapshot().then(
      document => { if (active) setState({ kind: 'ready', document }); },
      (error: unknown) => { if (active) setState({ kind: 'error', message: error instanceof Error ? error.message : 'Unable to load the studio. Try again.' }); },
    );
    return () => { active = false; };
  }, [attempt]);

  function reload() { setState({ kind: 'loading' }); setAttempt(value => value + 1); }
  if (state.kind === 'ready') return <StudioShell document={state.document} reload={reload} />;
  return <main id="studio" className="studio studio-connection">
    <header className="studio-header"><div className="studio-wordmark"><Icon name="brand" /><span>AETHER-DOM</span></div><span>Local studio</span></header>
    <section className="studio-connection-message" aria-busy={state.kind === 'loading'}><h1>{state.kind === 'loading' ? 'Opening studio…' : 'Studio unavailable'}</h1><p role={state.kind === 'error' ? 'alert' : 'status'}>{state.kind === 'loading' ? 'Loading the local document and checking its contract.' : state.message}</p><button className="studio-button" disabled={state.kind === 'loading'} onClick={reload}>{state.kind === 'loading' ? 'Loading document…' : 'Try again'}</button></section>
    {state.kind === 'loading' ? <div className="studio-skeleton" aria-hidden="true"><div /><div /><div /></div> : null}
  </main>;
}
