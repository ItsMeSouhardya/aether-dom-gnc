'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { validateJobRequest, type CdomDocument, type Job, type JobRequest, type Proposal } from '@aether-dom/schema';
import type { CommandOperation } from '../../features/commands/draft';
import { cancelJob, enqueueJob, getJob, JobRequestError, loadJobResult, loadJobs, retryJob } from '../../lib/job-api';
import { rejectProposal } from '../../lib/proposal-api';
import { ProposalReview } from '../proposals/proposal-panel';
import { usePresentationWorkspace } from '../presentation-context';

type Props = { document: CdomDocument; layerId: string | null; shotId: string | null; busy: boolean; blocked: boolean; run: (operation: CommandOperation, reason: string, revision?: number) => Promise<boolean>; onClose: () => void };
const pendingMemory = new Map<string, JobRequest>();
const message = (error: unknown) => error instanceof Error ? error.message : 'The job request failed. Refresh jobs.';
const operation = { repair_pose: 'setLayerPose', move_right: 'setLayerTransform', set_tension: 'setShotTension' } as const;
const active = (job: Job) => job.status === 'queued' || job.status === 'running' || job.status === 'failed' && Boolean(job.error?.retryable);

export function JobPanel(props: Props) {
  return <Panel key={`${props.document.project.id}:${props.document.project.activeBranchId}`} {...props} />;
}
function Panel({ document, layerId, shotId, busy, blocked, run, onClose }: Props) {
  const workspace = usePresentationWorkspace();
  const layer = document.layers.find(item => item.id === layerId), shot = document.shots.find(item => item.id === shotId);
  const [intent, setIntent] = useState<JobRequest['intent']>(layer ? 'move_right' : 'set_tension');
  const scopeId = intent === 'set_tension' ? shot?.id : layer?.id;
  const [text, setText] = useState('');
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [selected, setSelected] = useState<Job | null>(null);
  const selectedRef = useRef<Job | null>(null);
  const [pending, setPending] = useState<JobRequest | null>(null);
  const [review, setReview] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [working, setWorking] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const mounted = useRef(false), action = useRef(false), generation = useRef(0);
  const listController = useRef<AbortController | null>(null), actionController = useRef<AbortController | null>(null);
  const fetching = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const pendingKey = `aether.pending-job:${document.project.id}:${document.project.activeBranchId}`;
  const choose = (job: Job | null) => { selectedRef.current = job; setSelected(job); };

  const remember = useCallback((request: JobRequest | null) => {
    setPending(request);
    if (request) pendingMemory.set(pendingKey, request); else pendingMemory.delete(pendingKey);
    try { if (request) sessionStorage.setItem(pendingKey, JSON.stringify(request)); else sessionStorage.removeItem(pendingKey); } catch { /* Memory still protects a drawer remount when session storage is unavailable. */ }
  }, [pendingKey]);

  useEffect(() => {
    mounted.current = true;
    const hydrate = window.setTimeout(() => {
      let saved = pendingMemory.get(pendingKey);
      try {
        const raw = sessionStorage.getItem(pendingKey);
        if (raw && raw.length <= 16384) { const parsed = validateJobRequest(JSON.parse(raw)); if (parsed.valid) saved = parsed.request; }
      } catch { /* Treat unavailable/malformed draft storage as absent. */ }
      if (saved) { pendingMemory.set(pendingKey, saved); setPending(saved); }
    }, 0);
    return () => { clearTimeout(hydrate); mounted.current = false; generation.current += 1; listController.current?.abort(); actionController.current?.abort(); };
  }, [pendingKey]);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    listController.current?.abort();
    const controller = new AbortController(); listController.current = controller;
    fetching.current = true;
    try {
      const records = await loadJobs(document, controller.signal);
      let detail = selectedRef.current;
      if (detail) detail = records.find(item => item.jobId === detail?.jobId) ?? await getJob(document, detail.jobId, controller.signal);
      if (!mounted.current || generation.current !== current) return;
      const awaiting = pendingMemory.get(pendingKey);
      const accepted = awaiting ? records.find(item => item.request.requestId === awaiting.requestId) : null;
      if (accepted) { remember(null); detail = accepted; }
      setJobs(records); choose(detail); setListError(''); setUncertain(false);
    } catch (error) { if (mounted.current && generation.current === current && !controller.signal.aborted) setListError(message(error)); }
    finally { if (generation.current === current) { fetching.current = false; if (mounted.current) setLoading(false); } }
  }, [document, pendingKey, remember]);

  useEffect(() => {
    const initial = window.setTimeout(() => { void refresh(); }, 0);
    const timer = window.setInterval(() => { if (!window.document.hidden && !action.current && !fetching.current) void refresh(); }, 2500);
    const visible = () => { if (!window.document.hidden && !action.current && !fetching.current) void refresh(); };
    window.document.addEventListener('visibilitychange', visible);
    return () => { clearTimeout(initial); clearInterval(timer); window.document.removeEventListener('visibilitychange', visible); generation.current += 1; listController.current?.abort(); };
  }, [refresh]);

  useEffect(() => { if (review?.proposalId) { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: 'start' }); } }, [review?.proposalId]);

  function store(job: Job) {
    generation.current += 1; listController.current?.abort();
    fetching.current = false;
    choose(job); setReview(null); setListError(''); setLoading(false);
    setJobs(current => [job, ...(current ?? []).filter(item => item.jobId !== job.jobId)].slice(0, 20));
  }
  async function perform(work: (signal: AbortSignal) => Promise<void>) {
    if (action.current) return;
    action.current = true; setWorking(true); setError('');
    generation.current += 1; listController.current?.abort();
    fetching.current = false;
    const controller = new AbortController(); actionController.current = controller;
    try { await work(controller.signal); }
    catch (error) { if (mounted.current && !controller.signal.aborted) { setError(message(error)); setUncertain(true); } }
    finally { action.current = false; if (mounted.current) setWorking(false); }
  }
  const enqueue = () => perform(async signal => {
    if (!pending && (!scopeId || busy || blocked)) return;
    const request = pending ?? { requestId: crypto.randomUUID(), expectedRevision: document.project.revision, scopeIds: [scopeId!], allowedOps: [operation[intent]], intent, message: text };
    remember(request);
    let job: Job;
    try { job = await enqueueJob(document, request, signal); }
    catch (error) { if (mounted.current && error instanceof JobRequestError && error.definitelyRejected) remember(null); throw error; }
    if (mounted.current && !signal.aborted) { remember(null); store(job); setUncertain(false); }
  });
  const inspectResult = () => selected && perform(async signal => {
    const proposal = await loadJobResult(document, selected, signal);
    if (mounted.current && !signal.aborted) { setReview(proposal); setUncertain(false); }
  });
  const decide = (approve: boolean) => review && selected && perform(async signal => {
    if (approve) {
      const confirmed = await run({ op: 'approveProposal', targetId: review.proposalId, args: {} }, 'Approve reviewed job result', review.baseRevision);
      if (!confirmed) throw new Error('Approval was not confirmed. Reload latest and review the result again.');
      const updated = await loadJobResult(document, selected, signal);
      if (mounted.current && !signal.aborted) setReview(updated);
    } else {
      const rejected = await rejectProposal(document, review.proposalId);
      if (mounted.current && !signal.aborted) setReview(rejected);
    }
  });
  const canQueue = !working && !busy && !blocked && !loading && (pending || scopeId && (intent !== 'repair_pose' || layer?.characterId));
  return <section className="inspector-section proposal-panel job-panel" aria-label="Jobs">
    <div className="inspector-section-heading"><h2>Jobs</h2><button className="studio-button" type="button" disabled={working} onClick={onClose}>Close jobs</button></div>
    <p className="panel-note">Local mock · zero cost · saved-revision inputs. A completed job creates a proposal for review. Only an explicit approval changes canon.</p>
    <form className="lore-editor proposal-form" aria-label="Queue mock job" onSubmit={event => { event.preventDefault(); void enqueue(); }}>
      <h3>Queue a proposal</h3>
      <label>Job scenario<select aria-label="Job scenario" value={intent} disabled={working || Boolean(pending)} onChange={event => { setIntent(event.target.value as JobRequest['intent']); setError(''); }}>
        <option value="move_right" disabled={!layer}>Move selected layer right</option>
        <option value="repair_pose" disabled={!layer?.characterId}>Use the right arm</option>
        <option value="set_tension" disabled={!shot}>Set shot tension to 0.8</option>
      </select></label>
      <p className="panel-note">Scope: <code>{pending?.scopeIds.join(', ') ?? scopeId ?? 'Select a layer or shot'}</code> · Base revision {pending?.expectedRevision ?? document.project.revision}. Permission: <code>{pending?.allowedOps.join(', ') ?? operation[intent]}</code>.</p>
      <label>Job context message<textarea aria-label="Job context message" value={text} maxLength={2000} disabled={working || Boolean(pending)} onChange={event => setText(event.target.value)} /></label>
      <p className="panel-note">The mock follows the selected scenario. Message text is inert context; it cannot expand permissions.</p>
      {pending ? <p className="panel-note" role="status">An enqueue request is awaiting confirmation. Retry reuses its exact identity and captured scope, including after reopening this drawer.</p> : null}
      {blocked ? <p className="panel-note">Reload latest before queuing or approving new work.</p> : null}
      <button className="studio-button studio-primary" disabled={!canQueue}>{working ? 'Working…' : pending ? 'Retry enqueue' : 'Queue mock job'}</button>
    </form>
    {error ? <p className="transform-validation" role="alert">{error}</p> : null}
    {working ? <p className="panel-note" role="status">Waiting for confirmation…</p> : null}
    {selected ? <section className="lore-editor job-details" aria-label="Job details">
      <h3>Job details</h3><p><code>{selected.jobId}</code></p>
      <p className="panel-note" role="status">{selected.status} · Attempt {selected.attempt} of {selected.maxAttempts} · {selected.progress}% complete</p>
      <progress aria-label="Job progress" value={selected.progress} max={100} />
      <p className="panel-note">Captured revision {selected.baseRevision} · Current revision {document.project.revision}</p>
      {selected.status === 'queued' ? <p className="panel-note">Waiting for the local worker. Start <code>{workspace ? `node tools/presentation.mjs worker --workspace ${workspace} --once` : 'pnpm jobs:worker'}</code> in a separate terminal. {workspace ? 'The worker may claim any eligible queued job in this disposable workspace database.' : 'The worker may claim any eligible queued job in the selected database.'} Refresh jobs to check progress.</p> : null}
      {selected.nextAttemptAt ? <p className="panel-note">Automatic retry is eligible at {selected.nextAttemptAt}. Cancel job stops the scheduled work.</p> : null}
      {selected.status === 'stale' || selected.baseRevision !== document.project.revision ? <p className="panel-note">The saved branch advanced. Queue a new job from the latest revision; this captured result cannot be approved.</p> : null}
      {selected.error ? <p className="transform-validation">{selected.error.message}{selected.error.retryable ? ' Retry is available while attempts remain.' : ''}</p> : null}
      <p className="panel-note">{selected.provider} · {selected.modelVersion} · Estimated {selected.estimatedCost.amount} {selected.estimatedCost.currency} · Actual {selected.actualCost ? `${selected.actualCost.amount} ${selected.actualCost.currency}` : 'not recorded yet'}</p>
      <details className="proposal-context"><summary>Captured input and artifact</summary><p className="panel-note">Input SHA256: <code>{selected.inputHash}</code></p><p className="panel-note">Scope: {selected.request.scopeIds.join(', ')} · Permissions: {selected.request.allowedOps.join(', ')}</p><p className="panel-note">Created {selected.createdAt} · Updated {selected.updatedAt}</p>{selected.leaseExpiresAt ? <p className="panel-note">Worker lease expires {selected.leaseExpiresAt}. After expiry a worker recovers the attempt for explicit retry.</p> : null}{selected.result ? <p className="panel-note">Proposal <code>{selected.result.proposalId}</code> · Initial artifact SHA256 <code>{selected.result.sha256}</code></p> : null}</details>
      <div className="transform-editor-actions">
        {active(selected) ? <button className="studio-button" disabled={working || uncertain} type="button" onClick={() => { void perform(async signal => { const saved = await cancelJob(document, selected, signal); if (mounted.current && !signal.aborted) store(saved); }); }}>Cancel job</button> : null}
        {selected.status === 'failed' && selected.error?.retryable && selected.attempt < selected.maxAttempts ? <button className="studio-button" disabled={working || uncertain || busy || blocked || selected.baseRevision !== document.project.revision} type="button" onClick={() => { void perform(async signal => { const saved = await retryJob(document, selected, signal); if (mounted.current && !signal.aborted) store(saved); }); }}>Retry job</button> : null}
        {selected.status === 'succeeded' && selected.result ? <button className="studio-button studio-primary" disabled={working} type="button" onClick={() => { void inspectResult(); }}>Review result</button> : null}
      </div>
    </section> : null}
    {review ? <ProposalReview proposal={review} headingRef={heading} currentRevision={document.project.revision} busy={busy || working || uncertain} blocked={blocked} onApprove={() => { void decide(true); }} onReject={() => { void decide(false); }} /> : null}
    <section className="lore-editor" aria-label="Job history"><div className="inspector-section-heading"><h3>Recent jobs</h3><button className="studio-button" type="button" disabled={working || loading} onClick={() => { setLoading(true); void refresh(); }}>Refresh jobs</button></div>
      {loading ? <p className="panel-note" role="status">Loading saved jobs…</p> : null}
      {listError ? <p className="transform-validation" role="alert">{listError}</p> : null}
      {jobs?.length ? <ul className="proposal-list">{jobs.map(job => <li key={job.jobId}><button className="studio-button" type="button" aria-pressed={selected?.jobId === job.jobId} disabled={working} onClick={() => { choose(job); setReview(null); setError(''); setUncertain(false); }}>Inspect {job.jobId}</button><span className="panel-note">{job.status} · revision {job.baseRevision} · attempt {job.attempt}/{job.maxAttempts}</span></li>)}</ul> : !loading && !listError ? <p className="panel-note">No saved jobs on this branch. Select a layer or shot, queue a mock job, then run the local worker.</p> : null}
    </section>
  </section>;
}
