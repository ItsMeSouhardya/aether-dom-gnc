'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { loadProject, submitCommand, ProjectApiError, type ProjectSnapshot } from '@/lib/project-api';
import { makeCommand, type CommandOperation } from '@/features/commands/draft';
import { StudioShell } from './studio-shell';
import { Icon } from './icons';

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; snapshot: ProjectSnapshot };

export default function StudioLoader({ projectId = 'proj_neon_shogun', branchId = 'branch_main', initialError }: { projectId?: string; branchId?: string; initialError?: string }) {
  const [state, setState] = useState<State>(() => initialError ? { kind: 'error', message: initialError } : { kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [requiresReload, setRequiresReload] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const writing = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (initialError) return;
    let active = true;
    loadProject(projectId, branchId).then(
      snapshot => { if (active) setState({ kind: 'ready', snapshot }); },
      (error: unknown) => { if (active) setState({ kind: 'error', message: error instanceof Error ? error.message : 'Unable to load the studio. Try again.' }); },
    );
    return () => { active = false; };
  }, [attempt, projectId, branchId, initialError]);

  function reload() {
    if (writing.current) return;
    setRequiresReload(false); setFeedback(null); setState({ kind: 'loading' }); setAttempt(value => value + 1);
  }
  async function run(operation: CommandOperation, reason: string, expectedRevision?: number): Promise<boolean> {
    if (writing.current || requiresReload || state.kind !== 'ready') return false;
    writing.current = true; setBusy(true); setFeedback({ error: false, message: 'Saving…' });
    let sent = false;
    try {
      const command = makeCommand(state.snapshot.document, operation, reason, expectedRevision);
      sent = true;
      const result = await submitCommand(command);
      if (!mounted.current) return false;
      setState({ kind: 'ready', snapshot: { document: result.document, history: result.history, analysis: result.analysis } });
      setFeedback({ error: false, message: `Saved locally · Revision ${result.document.project.revision}` });
      return true;
    } catch (error) {
      if (!mounted.current) return false;
      const reloadNeeded = error instanceof ProjectApiError ? error.requiresReload : sent;
      setRequiresReload(reloadNeeded);
      setFeedback({ error: true, message: error instanceof Error ? error.message : 'Unable to save. Reload latest and try again.' });
      return false;
    } finally { writing.current = false; if (mounted.current) setBusy(false); }
  }
  if (state.kind === 'ready') return <StudioShell document={state.snapshot.document} history={state.snapshot.history} analysis={state.snapshot.analysis} reload={reload} busy={busy} requiresReload={requiresReload} feedback={feedback} run={run} />;
  return <main id="studio" className="studio studio-connection">
    <header className="studio-header"><a className="studio-wordmark" href="/welcome" aria-label="AETHER-DOM home"><Icon name="brand" /><span>AETHER-DOM</span></a><span>Local studio</span></header>
    <section className="studio-connection-message" aria-busy={state.kind === 'loading'}><h1>{state.kind === 'loading' ? 'Opening studio…' : 'Studio unavailable'}</h1><p role={state.kind === 'error' ? 'alert' : 'status'}>{state.kind === 'loading' ? 'Loading the local document and checking its contract.' : state.message}</p>{initialError ? <Link className="studio-button" href="/studio">Studio home</Link> : <button className="studio-button" disabled={state.kind === 'loading'} onClick={reload}>{state.kind === 'loading' ? 'Loading document…' : 'Try again'}</button>}</section>
    {state.kind === 'loading' ? <div className="studio-skeleton" aria-hidden="true"><div /><div /><div /></div> : null}
  </main>;
}
