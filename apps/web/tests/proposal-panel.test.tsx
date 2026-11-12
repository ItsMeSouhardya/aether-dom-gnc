import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { CdomDocument, Proposal } from '@aether-dom/schema';
import sample from '../../../packages/schema/fixtures/sample.cdom.json';
import { ProposalPanel, ProposalReview } from '../src/components/proposals/proposal-panel';

const document = structuredClone(sample) as CdomDocument;
const layer = document.layers.find(item => item.characterId)!;
const proposal: Proposal = {
  proposalId: 'proposal_pose', projectId: document.project.id, branchId: document.project.activeBranchId,
  baseRevision: 0, agentRole: 'lore', scopeIds: [layer.id], allowedOps: ['setLayerPose'], intent: 'repair_pose', message: 'Repair the selected pose.',
  operations: [{ op: 'setLayerPose', targetId: layer.id, args: { pose: 'lifting_with_right_arm' } }],
  evidenceNodeIds: ['event_left_arm_injured'], explanation: '<script>unsafe()</script> Use the right arm.',
  contextNodes: [{ id: 'event_left_arm_injured', kind: 'event', value: { description: 'Left arm injured' } }], contextDigest: 'a'.repeat(64),
  diff: [{ entityId: layer.id, path: 'pose', before: 'lifting_with_left_arm', after: 'lifting_with_right_arm', beforePresent: true, afterPresent: true }],
  schemaVersionBefore: '0.1.0', schemaVersionAfter: '0.1.0', provider: 'local_mock', modelVersion: 'deterministic-v1',
  estimatedCost: { amount: 0, currency: 'USD' }, previewRef: null, status: 'pending_review', createdAt: '2026-11-12T00:00:00Z',
  reviewedAt: null, reviewedBy: null, approvalCommandId: null,
};

function panel(layerId: string | null = layer.id, shotId: string | null = document.shots[0].id, blocked = false) {
  const run = vi.fn(async () => true);
  const markup = renderToStaticMarkup(createElement(ProposalPanel, { document, layerId, shotId, busy: false, blocked, run, onClose: vi.fn() }));
  return { markup, run };
}

function review(value: Proposal = proposal, revision = 0, blocked = false) {
  return renderToStaticMarkup(createElement(ProposalReview, { proposal: value, currentRevision: revision, busy: false, blocked, onApprove: vi.fn(), onReject: vi.fn() }));
}

describe('proposal request and human review', () => {
  it('starts with an explicit selected-character pose permission and no canonical command', () => {
    const { markup, run } = panel();
    expect(run).not.toHaveBeenCalled();
    expect(markup).toContain('aria-label="AI proposals"');
    expect(markup).toContain('Local mock provider');
    expect(markup).toContain('offline');
    expect(markup).toContain('aria-label="Scope"');
    expect(markup).toContain('value="repair_pose" selected');
    expect(markup).toMatch(/aria-label="Allow setLayerPose"[^>]*checked/);
    expect(markup).not.toMatch(/aria-label="Allow setLayerTransform"[^>]*checked/);
    expect(markup).toContain('aria-label="Request message"');
    expect(markup).toContain('untrusted');
    expect(markup).toContain('Generate proposal');
  });

  it('offers shot tension when no layer is selected and blocks generation without valid canon', () => {
    expect(panel(null).markup).toContain('value="set_tension" selected');
    const empty = panel(null, null).markup;
    expect(empty).toContain('Choose a layer or shot');
    expect(empty).toMatch(/<button[^>]*disabled[^>]*>Generate proposal/);
    expect(panel(layer.id, document.shots[0].id, true).markup).toMatch(/<button[^>]*disabled[^>]*>Generate proposal/);
  });

  it('renders the exact field diff, immutable permissions and provided context as safe text', () => {
    const markup = review();
    expect(markup).toContain('lifting_with_left_arm');
    expect(markup).toContain('lifting_with_right_arm');
    expect(markup).toContain('pose');
    expect(markup).toContain(layer.id);
    expect(markup).toContain('setLayerPose');
    expect(markup).toContain('event_left_arm_injured');
    expect(markup).toContain('Left arm injured');
    expect(markup).toContain('0 USD');
    expect(markup).toContain('deterministic-v1');
    expect(markup).toContain('&lt;script&gt;unsafe()&lt;/script&gt;');
    expect(markup).not.toContain('<script>');
    expect(markup).toMatch(/<button(?![^>]*disabled)[^>]*>Approve proposal/);
  });

  it('keeps a stale proposal rejectable while requiring reload and regeneration before approval', () => {
    const markup = review(proposal, 1);
    expect(markup).toContain('Base revision 0');
    expect(markup).toContain('Current revision 1');
    expect(markup).toContain('generate a new proposal');
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>Approve proposal/);
    expect(markup).toMatch(/<button(?![^>]*disabled)[^>]*>Reject proposal/);
  });

  it('distinguishes absent authored fields from explicit null and preserves a recorded decision', () => {
    const markup = review({ ...proposal, status: 'approved', reviewedBy: 'local_creator', reviewedAt: '2026-11-12T00:01:00Z', approvalCommandId: 'approval_one', diff: [{ entityId: 'shot_rooftop', path: 'audio.tension', before: null, after: .8, beforePresent: false, afterPresent: true }] }, 1);
    expect(markup).toContain('Not authored');
    expect(markup).toContain('0.8');
    expect(markup).toContain('approved');
    expect(markup).toContain('local_creator');
    expect(markup).not.toContain('>Approve proposal</button>');
    expect(markup).not.toContain('>Reject proposal</button>');
  });
});
