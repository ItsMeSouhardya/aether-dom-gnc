'use client';
import { useEffect, useRef, useState } from 'react';
import type { BranchSummary, CdomDocument, ForkBranchCommand, ThreeWayDiff } from '@aether-dom/schema';
import { BranchApiError, compareBranches, forkBranch, listBranches } from '../../lib/branch-api';

type Props = { document: CdomDocument; busy: boolean; blocked: boolean; onBusyChange: (busy: boolean) => void; onSwitch: (id: string) => void; reload: () => void; onClose: () => void };
export function BranchPanel({ document, busy, blocked, onBusyChange, onSwitch, reload, onClose }: Props) {
  const { id: projectId, activeBranchId, revision } = document.project;
  const [branches, setBranches] = useState<BranchSummary[]>([]), [attempt, refresh] = useState(0);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
  const [selected, select] = useState(activeBranchId), [compareId, chooseCompare] = useState('');
  const [name, setName] = useState(''), [pending, setPending] = useState<ForkBranchCommand | null>(null);
  const [forking, setForking] = useState(false), [forkError, setForkError] = useState<BranchApiError | null>(null);
  const [created, setCreated] = useState<BranchSummary | null>(null);
  const [comparing, setComparing] = useState(false), [diff, setDiff] = useState<ThreeWayDiff | null>(null), [diffError, setDiffError] = useState('');
  const generation = useRef(0), compareGeneration = useRef(0), mounted = useRef(true);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (diff) { reviewHeading.current?.focus(); reviewHeading.current?.scrollIntoView({ block: 'start' }); } }, [diff]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController(), token = ++generation.current;
    void listBranches(projectId, controller.signal).then(items => {
      if (controller.signal.aborted || generation.current !== token) return;
      setBranches(items); setLoading(false); setLoadError('');
    }).catch((error: unknown) => {
      if (controller.signal.aborted || generation.current !== token) return;
      setLoadError(error instanceof Error ? error.message : 'Branches are unavailable. Retry.'); setLoading(false);
    });
    return () => controller.abort();
  }, [projectId, revision, attempt]);
  const disabled = busy || blocked || forking;
  const current = branches.find(branch => branch.id === activeBranchId);
  const comparison = diff?.left.revision === revision && diff.left.branchId === activeBranchId ? diff : null;
  return <section className="branch-panel" aria-label="Branches">
    <div className="panel-heading"><h2>Branches</h2><button className="studio-button" disabled={forking} onClick={onClose}>Close branches</button></div>
    <div className="branch-content">
      <p className="panel-note"><strong>{current?.name ?? activeBranchId}</strong> · Revision {revision}<br /><code>{activeBranchId}</code></p>
      <section className="lore-editor"><h3>Switch branch</h3><p className="panel-note">Switching discards unsaved drafts and stops preview. Saved histories stay separate.</p>
        {loading ? <p role="status">Loading branches…</p> : null}
        {loadError ? <p role="alert" className="transform-validation">{loadError}</p> : null}
        <label>Branch<select aria-label="Studio branch" value={selected} disabled={disabled || loading || !branches.length} onChange={event => select(event.target.value)}>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name} · {branch.id} · r{branch.headRevision}</option>)}</select></label>
        <div className="transform-editor-actions"><button className="studio-button" disabled={disabled || selected === activeBranchId || !branches.some(branch => branch.id === selected)} onClick={() => onSwitch(selected)}>Open branch</button><button className="studio-button" disabled={forking} onClick={() => { setLoading(true); refresh(value => value + 1); }}>Refresh branches</button></div>
      </section>
      <form className="lore-editor" aria-label="Fork branch" onSubmit={async event => {
        event.preventDefault(); if (disabled || !name.trim()) return;
        const command: ForkBranchCommand = pending ?? { commandId: `fork_${crypto.randomUUID()}`, op: 'forkBranch', projectId, sourceBranchId: activeBranchId, expectedRevision: revision, newBranchId: `branch_${crypto.randomUUID()}`, name: name.trim(), actor: { kind: 'human', id: 'local_creator' }, reason: `Fork ${activeBranchId} as ${name.trim()}` };
        setPending(command); setForking(true); onBusyChange(true); setForkError(null); setCreated(null);
        try {
          const result = await forkBranch(command);
          if (!mounted.current) return;
          setCreated(result.branch); setPending(null); setName(''); select(result.branch.id); chooseCompare(result.branch.id); refresh(value => value + 1);
        } catch (error) {
          if (!mounted.current) return;
          const failure = error instanceof BranchApiError ? error : new BranchApiError('Fork outcome is unknown. Refresh branches or retry the same fork.', 0, true);
          setForkError(failure); if (!failure.unknownOutcome) setPending(null);
        } finally { if (mounted.current) { setForking(false); onBusyChange(false); } }
      }}>
        <h3>Fork this saved revision</h3><p className="panel-note">Creates an isolated copy at revision {pending?.expectedRevision ?? revision}. The source stays unchanged. Fork creation is permanent branch history; Undo edits within a branch.</p>
        <label>Fork name<input aria-label="Fork name" required maxLength={80} value={name} disabled={disabled || pending !== null} onChange={event => setName(event.target.value)} /></label>
        {forkError ? <p role="alert" className="transform-validation">{forkError.message}</p> : null}
        <div className="transform-editor-actions"><button className="studio-button studio-primary" disabled={disabled || !name.trim()}>{forking ? 'Creating fork…' : pending ? 'Retry same fork' : 'Create fork'}</button>{forkError?.status === 409 ? <button className="studio-button" type="button" onClick={reload}>Reload source</button> : null}</div>
        {created ? <p role="status" className="panel-note">Fork created: {created.name} · <code>{created.id}</code>. Choose Open branch to work there.</p> : null}
      </form>
      <section className="lore-editor"><h3>Three-way comparison</h3><p className="panel-note">A read-only prototype using the actual common base. Conflicts need human resolution; comparison does not apply or overwrite changes. Arrays are compared as whole fields.</p>
        <label>Compare with<select aria-label="Compare branch" value={compareId} disabled={disabled || comparing} onChange={event => { chooseCompare(event.target.value); setDiff(null); setDiffError(''); compareGeneration.current++; }}><option value="">Choose another branch</option>{branches.filter(branch => branch.id !== activeBranchId).map(branch => <option key={branch.id} value={branch.id}>{branch.name} · {branch.id}</option>)}</select></label>
        {branches.length === 1 ? <p className="panel-note">Create a fork to compare alternate edits.</p> : null}
        <button className="studio-button" disabled={disabled || comparing || !compareId} onClick={async () => {
          const token = ++compareGeneration.current; setComparing(true); setDiffError('');
          try {
            const value = await compareBranches(projectId, activeBranchId, compareId);
            if (!mounted.current || compareGeneration.current !== token) return;
            if (value.left.revision !== revision) throw new Error('The source changed. Reload latest before comparing its saved head.');
            setDiff(value);
          } catch (error) { if (mounted.current && compareGeneration.current === token) setDiffError(error instanceof Error ? error.message : 'Comparison unavailable. Retry.'); }
          finally { if (mounted.current && compareGeneration.current === token) setComparing(false); }
        }}>{comparing ? 'Comparing…' : 'Compare branches'}</button>
        {diffError ? <p role="alert" className="transform-validation">{diffError}</p> : null}
      </section>
      {comparison ? <section className="branch-comparison" aria-label="Three-way diff"><h3 ref={reviewHeading} tabIndex={-1}>{comparison.conflictCount} {comparison.conflictCount === 1 ? 'conflict' : 'conflicts'} · {comparison.changes.length} changed fields</h3>
        <p className="panel-note">Base {comparison.base.branchId} r{comparison.base.revision} · Left {comparison.left.branchId} r{comparison.left.revision} · Right {comparison.right.branchId} r{comparison.right.revision}</p>
        {comparison.changes.length ? comparison.changes.map(change => <article className="branch-change" key={`${change.collection}:${change.entityId}:${change.path}`}><h4><code>{change.entityId}{change.path}</code></h4><p className="panel-note">{change.status.replaceAll('_', ' ')} · {change.collection}</p>
          <dl>{(['base', 'left', 'right'] as const).map(side => <div key={side}><dt>{side === 'base' ? 'Common base' : side === 'left' ? 'Current branch' : 'Compared branch'}</dt><dd><pre>{change[`${side}Present`] ? JSON.stringify(change[side], null, 2) : 'Absent'}</pre></dd></div>)}</dl>
        </article>) : <p className="panel-note">No authored differences at these saved heads.</p>}
      </section> : null}
    </div>
  </section>;
}
