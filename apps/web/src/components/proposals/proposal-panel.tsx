'use client';

import { useCallback, useEffect, useRef, useState, type Ref } from 'react';
import type { CdomDocument, Proposal, ProposalOpName, ProposalRequest } from '@aether-dom/schema';
import type { CommandOperation } from '../../features/commands/draft';
import { loadProposals, rejectProposal, requestProposal } from '../../lib/proposal-api';

export type ProposalPanelProps = {
  document: CdomDocument;
  layerId: string | null;
  shotId: string | null;
  busy: boolean;
  blocked: boolean;
  run: (operation: CommandOperation, reason: string, expectedRevision?: number) => Promise<boolean>;
  onClose: () => void;
};

type Scope = { id: string; kind: 'layer' | 'shot'; character: boolean };
const permissions: ProposalOpName[] = ['setLayerTransform', 'setLayerPose', 'setLayerAppearance', 'setShotCamera', 'setShotTension'];
const scenarioPermission: Record<ProposalRequest['intent'], ProposalOpName> = { repair_pose: 'setLayerPose', move_right: 'setLayerTransform', set_tension: 'setShotTension' };
const messageForError = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export function ProposalPanel(props: ProposalPanelProps) {
  return <Panel key={`${props.document.project.id}:${props.document.project.activeBranchId}`} {...props} />;
}

function Panel({ document, layerId, shotId, busy, blocked, run, onClose }: ProposalPanelProps) {
  const layer = document.layers.find(item => item.id === layerId);
  const shot = document.shots.find(item => item.id === shotId);
  const [scopeKind, setScopeKind] = useState<'layer' | 'shot'>(layer ? 'layer' : 'shot');
  const kind = scopeKind === 'layer' && layer ? 'layer' : shot ? 'shot' : layer ? 'layer' : null;
  const scope: Scope | null = kind === 'layer' && layer ? { id: layer.id, kind, character: Boolean(layer.characterId) } : kind === 'shot' && shot ? { id: shot.id, kind, character: false } : null;
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [review, setReview] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [uncertainId, setUncertainId] = useState<string | null>(null);
  const mounted = useRef(false);
  const listGeneration = useRef(0);
  const listController = useRef<AbortController | null>(null);
  const decisionActive = useRef(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const reviewId = review?.proposalId;
  useEffect(() => {
    if (!reviewId) return;
    reviewHeading.current?.focus({ preventScroll: true });
    reviewHeading.current?.scrollIntoView({ block: 'start' });
  }, [reviewId]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; listGeneration.current += 1; listController.current?.abort(); };
  }, []);

  const refresh = useCallback(() => {
    const generation = ++listGeneration.current;
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;
    return loadProposals(document, controller.signal).then(saved => {
      if (!mounted.current || generation !== listGeneration.current) return false;
      setProposals(saved);
      setListError('');
      setReview(current => current ? saved.find(item => item.proposalId === current.proposalId) ?? current : null);
      setUncertainId(null);
      return true;
    }, (error: unknown) => {
      if (mounted.current && generation === listGeneration.current && !controller.signal.aborted) setListError(messageForError(error, 'Saved proposals could not load. Refresh proposals to try again.'));
      return false;
    }).finally(() => {
      if (mounted.current && generation === listGeneration.current) setLoading(false);
    });
  }, [document]);

  useEffect(() => {
    void refresh();
    return () => { listGeneration.current += 1; listController.current?.abort(); };
  }, [refresh]);

  function storeRecord(proposal: Proposal) {
    listGeneration.current += 1;
    listController.current?.abort();
    setLoading(false); setListError('');
    setProposals(current => [proposal, ...(current ?? []).filter(item => item.proposalId !== proposal.proposalId)].slice(0, 20));
    setReview(proposal);
    setDecisionError('');
  }

  async function decide(approve: boolean) {
    if (!review || review.status !== 'pending_review' || busy || decisionActive.current || uncertainId === review.proposalId) return;
    if (approve && (blocked || review.baseRevision !== document.project.revision)) return;
    const captured = review;
    decisionActive.current = true;
    setDecisionBusy(true); setDecisionError('');
    try {
      if (approve) {
        const saved = await run({ op: 'approveProposal', targetId: captured.proposalId, args: {} }, 'Approve reviewed proposal', captured.baseRevision);
        if (!mounted.current) return;
        if (!saved) {
          setUncertainId(captured.proposalId);
          setDecisionError('Approval was not confirmed. Refresh proposals and reload latest before trying again.');
          return;
        }
        await refresh();
      } else {
        const rejected = await rejectProposal(document, captured.proposalId);
        if (mounted.current) storeRecord(rejected);
      }
    } catch (error) {
      if (mounted.current) {
        setUncertainId(captured.proposalId);
        setDecisionError(messageForError(error, 'The decision was not confirmed. Refresh proposals before trying again.'));
      }
    } finally {
      decisionActive.current = false;
      if (mounted.current) setDecisionBusy(false);
    }
  }

  return <section className="inspector-section proposal-panel" aria-label="AI proposals">
    <div className="inspector-section-heading"><h2>AI proposals</h2><button type="button" className="studio-button" disabled={decisionBusy} onClick={onClose}>Close proposals</button></div>
    <p className="panel-note">Local mock provider · offline deterministic demo. The chosen scenario creates a draft for review; it does not interpret the request message or call a language model.</p>
    <p className="panel-note">Generating and rejecting proposals leave saved canon unchanged. Only Approve proposal sends a canonical command.</p>
    <div className="lore-editor proposal-request">
      <h3>Request a proposal</h3>
      <label>Scope<select aria-label="Scope" value={kind ?? ''} disabled={!scope || decisionBusy} onChange={event => setScopeKind(event.target.value as 'layer' | 'shot')}>
        {!scope ? <option value="">No selection</option> : null}
        {layer ? <option value="layer">Selected layer · {layer.id}</option> : null}
        {shot ? <option value="shot">Selected shot · {shot.id}</option> : null}
      </select></label>
      <ProposalRequestForm key={scope ? `${scope.kind}:${scope.id}:${scope.character}` : 'none'} document={document} scope={scope} disabled={busy || blocked || decisionBusy} onCreated={storeRecord} />
      {blocked ? <p className="panel-note">Saving is blocked. Reload latest before generating or approving a proposal.</p> : null}
    </div>
    {decisionError ? <p className="transform-validation" role="alert">{decisionError}</p> : null}
    {decisionBusy ? <p className="panel-note" role="status">Saving proposal decision…</p> : null}
    {review ? <ProposalReview headingRef={reviewHeading} proposal={review} currentRevision={document.project.revision} busy={busy || decisionBusy || uncertainId === review.proposalId} blocked={blocked} onApprove={() => { void decide(true); }} onReject={() => { void decide(false); }} /> : <p className="panel-note">Choose a saved proposal to review its context, permissions and field diff.</p>}
    <div className="lore-editor proposal-history">
      <div className="inspector-section-heading"><h3>Saved proposals</h3><button type="button" className="studio-button" disabled={loading || decisionBusy} onClick={() => { setLoading(true); setListError(''); void refresh(); }}>Refresh proposals</button></div>
      {loading ? <p className="panel-note" role="status">Loading saved proposals…</p> : null}
      {listError ? <p className="transform-validation" role="alert">{listError}</p> : null}
      {proposals?.length ? <ul className="proposal-list">{proposals.map(proposal => <li key={proposal.proposalId}>
        <button type="button" className="studio-button" aria-pressed={review?.proposalId === proposal.proposalId} disabled={decisionBusy} onClick={() => { setReview(proposal); setDecisionError(''); }}>Review {proposal.proposalId}</button>
        <span className="panel-note">{proposal.intent} · {proposal.status} · Base revision {proposal.baseRevision}</span>
      </li>)}</ul> : !loading && !listError ? <p className="panel-note">No saved proposals. Choose a scope and generate a draft to inspect its exact changes before deciding.</p> : null}
    </div>
  </section>;
}

function ProposalRequestForm({ document, scope, disabled, onCreated }: { document: CdomDocument; scope: Scope | null; disabled: boolean; onCreated: (proposal: Proposal) => void }) {
  const initialIntent: ProposalRequest['intent'] = scope?.kind === 'shot' ? 'set_tension' : scope?.character ? 'repair_pose' : 'move_right';
  const [intent, setIntent] = useState(initialIntent);
  const [allowedOps, setAllowedOps] = useState<ProposalOpName[]>([scenarioPermission[initialIntent]]);
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(false);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const retry = useRef<{ fingerprint: string; request: ProposalRequest } | null>(null);
  const requestActive = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current += 1; controller.current?.abort(); };
  }, []);

  const supportsScenario = Boolean(scope && (intent === 'set_tension' ? scope.kind === 'shot' : scope.kind === 'layer' && (intent !== 'repair_pose' || scope.character)));
  const permittedScenario = allowedOps.includes(scenarioPermission[intent]);
  const controlsDisabled = disabled || generating;
  const canGenerate = scope && supportsScenario && permittedScenario && !controlsDisabled;

  return <form className="proposal-form" aria-label="Request proposal" onSubmit={async event => {
    event.preventDefault();
    if (!canGenerate || !scope || requestActive.current) return;
    const fields = { expectedRevision: document.project.revision, scopeIds: [scope.id], allowedOps: permissions.filter(op => allowedOps.includes(op)), intent, message };
    const fingerprint = JSON.stringify(fields);
    const request = retry.current?.fingerprint === fingerprint ? retry.current.request : { requestId: crypto.randomUUID(), ...fields };
    retry.current = { fingerprint, request };
    requestActive.current = true;
    const activeGeneration = ++generation.current;
    controller.current?.abort();
    const requestController = new AbortController();
    controller.current = requestController;
    setGenerating(true); setError('');
    try {
      const proposal = await requestProposal(document, request, requestController.signal);
      if (!mounted.current || activeGeneration !== generation.current) return;
      retry.current = null;
      onCreated(proposal);
    } catch (error) {
      if (mounted.current && activeGeneration === generation.current && !requestController.signal.aborted) setError(messageForError(error, 'The draft was not confirmed. Refresh proposals, then retry this request.'));
    } finally {
      requestActive.current = false;
      if (mounted.current && activeGeneration === generation.current) setGenerating(false);
    }
  }}>
    <label>Mock scenario<select aria-label="Mock scenario" value={intent} disabled={controlsDisabled || !scope} onChange={event => {
      const next = event.target.value as ProposalRequest['intent'];
      setIntent(next); setAllowedOps([scenarioPermission[next]]); setError('');
    }}>
      <option value="repair_pose" disabled={scope?.kind !== 'layer' || !scope.character}>repair_pose · Use the right arm</option>
      <option value="move_right" disabled={scope?.kind !== 'layer'}>move_right · Move X by +0.25</option>
      <option value="set_tension" disabled={scope?.kind !== 'shot'}>set_tension · Set tension to 0.8</option>
    </select></label>
    <label>Request message<textarea aria-label="Request message" value={message} maxLength={2000} disabled={controlsDisabled || !scope} onChange={event => setMessage(event.target.value)} /></label>
    <p className="panel-note">The request message is untrusted context data. It cannot expand the selected scope or operation permissions.</p>
    <fieldset className="proposal-permissions" disabled={controlsDisabled || !scope}><legend>Operation permissions</legend>{permissions.map(op => {
      const applicable = scope?.kind === 'shot' ? op === 'setShotCamera' || op === 'setShotTension' : op === 'setLayerTransform' || op === 'setLayerPose' || op === 'setLayerAppearance';
      return <label className="audio-toggle" key={op}><input type="checkbox" aria-label={`Allow ${op}`} checked={allowedOps.includes(op)} disabled={controlsDisabled || !scope || !applicable} onChange={event => {
        const checked = event.target.checked;
        setAllowedOps(current => checked ? [...current, op] : current.filter(item => item !== op));
      }} />Allow {op}</label>;
    })}</fieldset>
    <p className="panel-note">{scope ? `Drafts capture revision ${document.project.revision} and only ${scope.id}.` : 'Choose a layer or shot in the explorer before generating a proposal.'}</p>
    {scope && !permittedScenario ? <p className="panel-note">Allow {scenarioPermission[intent]} to generate this scenario, or choose another scenario.</p> : null}
    {error ? <p className="transform-validation" role="alert">{error}</p> : null}
    {generating ? <p className="panel-note" role="status">Generating offline proposal…</p> : null}
    <div className="transform-editor-actions"><button className="studio-button studio-primary" disabled={!canGenerate}>Generate proposal</button></div>
  </form>;
}

export function ProposalReview({ proposal, currentRevision, busy, blocked, onApprove, onReject, headingRef }: { proposal: Proposal; currentRevision: number; busy: boolean; blocked: boolean; onApprove: () => void; onReject: () => void; headingRef?: Ref<HTMLHeadingElement> }) {
  const pending = proposal.status === 'pending_review';
  const stale = proposal.baseRevision !== currentRevision;
  return <section className="lore-editor proposal-review" aria-label="Proposal review">
    <h3 ref={headingRef} tabIndex={-1}>Review proposal</h3>
    <p className="panel-note"><code>{proposal.proposalId}</code> · {proposal.status}</p>
    <p className="panel-note">Base revision {proposal.baseRevision} · Current revision {currentRevision}</p>
    <p className="panel-note">Local mock provider · <code>{proposal.provider}</code> · Model <code>{proposal.modelVersion}</code> · Estimated cost {proposal.estimatedCost.amount} {proposal.estimatedCost.currency}</p>
    {pending && stale ? <p className="transform-validation" role="status">This proposal is stale. Reload latest, then generate a new proposal against the current revision. Its captured scope and diff have not been rebased.</p> : null}
    <p className="panel-note">{proposal.explanation}</p>
    <details className="proposal-context"><summary>Request and permitted scope</summary>
      <p className="panel-note">Scenario: {proposal.intent} · Role: {proposal.agentRole}</p>
      <p className="panel-note">Request message (untrusted data): {proposal.message || '(empty)'}</p>
      <h4>Editable scope IDs</h4><ul>{proposal.scopeIds.map(id => <li key={id}><code>{id}</code></li>)}</ul>
      <h4>Allowed operations</h4><ul>{proposal.allowedOps.map(op => <li key={op}><code>{op}</code></li>)}</ul>
      <h4>Proposed operations</h4><ol>{proposal.operations.map((operation, index) => <li key={index}><code>{operation.op}</code> · <code>{operation.targetId}</code><pre>{JSON.stringify(operation.args, null, 2)}</pre></li>)}</ol>
    </details>
    <div className="proposal-diff"><h4>Exact authored field changes</h4><ul>{proposal.diff.map((change, index) => <li key={index}>
      <p><code>{change.entityId}</code> · <code>{change.path}</code></p>
      <dl className="reference-values"><div><dt>Before</dt><dd><code>{change.beforePresent ? JSON.stringify(change.before) : 'Not authored'}</code></dd></div><div><dt>After</dt><dd><code>{change.afterPresent ? JSON.stringify(change.after) : 'Not authored'}</code></dd></div></dl>
    </li>)}</ul></div>
    <p className="panel-note">Document schema: {proposal.schemaVersionBefore} → {proposal.schemaVersionAfter}{proposal.schemaVersionBefore === proposal.schemaVersionAfter ? ' (unchanged)' : ' (changes on approval)'}</p>
    {proposal.operations.some(operation => operation.op === 'setLayerPose') ? <p className="panel-note">Pose changes authored metadata; it does not automatically rig or redraw a sprite.</p> : null}
    <details className="proposal-context"><summary>Read context · {proposal.contextNodes.length} nodes</summary>
      <p className="panel-note">These are the exact nodes provided to the offline mock. Context digest: <code>{proposal.contextDigest}</code></p>
      <ul>{proposal.contextNodes.map(node => <li key={node.id}><p><code>{node.id}</code> · {node.kind}</p><pre>{JSON.stringify(node.value, null, 2)}</pre></li>)}</ul>
      <h4>Evidence IDs</h4>{proposal.evidenceNodeIds.length ? <ul>{proposal.evidenceNodeIds.map(id => <li key={id}><code>{id}</code></li>)}</ul> : <p className="panel-note">No evidence nodes cited.</p>}
    </details>
    {pending ? <div className="transform-editor-actions"><button type="button" className="studio-button studio-primary" disabled={busy || blocked || stale} onClick={onApprove}>Approve proposal</button><button type="button" className="studio-button" disabled={busy} onClick={onReject}>Reject proposal</button></div> : <p className="panel-note">Decision recorded{proposal.reviewedBy ? ` by ${proposal.reviewedBy}` : ''}{proposal.reviewedAt ? ` at ${proposal.reviewedAt}` : ''}.{proposal.approvalCommandId ? <> Approval command: <code>{proposal.approvalCommandId}</code>. Undo changes canon while retaining this decision.</> : null}</p>}
  </section>;
}
