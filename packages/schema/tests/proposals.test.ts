import { describe, expect, it } from 'vitest';
import { validateCommand, validateProposal, validateProposalRequest } from '../src/index';
import arrayBoundParity from '../fixtures/proposal-array-bound-parity.json';
import metadataBoundary from '../fixtures/proposal-metadata-boundary.json';
import numericBoundary from '../fixtures/proposal-numeric-boundary.json';

const request = { requestId: 'req_one', expectedRevision: 0, scopeIds: ['layer_kael'], allowedOps: ['setLayerPose'], intent: 'repair_pose', message: '' };
describe('proposal permission contracts', () => {
  it('accepts explicit bounded permissions without mutation', () => {
    const before = JSON.stringify(request);
    expect(validateProposalRequest(request).valid).toBe(true);
    expect(JSON.stringify(request)).toBe(before);
  });
  it.each([{ scopeIds: [] }, { scopeIds: ['a', 'a'] }, { allowedOps: ['undo'] }, { allowedOps: [] }, { message: '\ud800' }, { expectedRevision: Infinity }, { status: 'approved' }])('rejects malformed authority %#', value => {
    expect(validateProposalRequest({ ...request, ...value }).valid).toBe(false);
  });
  it('allows only an explicit human empty-args approval command', () => {
    const command = { commandId: 'cmd_one', projectId: 'p', branchId: 'b', expectedRevision: 0, actor: { kind: 'human', id: 'creator' }, reason: 'Approve reviewed diff', op: 'approveProposal', targetId: 'proposal_one', args: {} };
    expect(validateCommand(command).valid).toBe(true);
    expect(validateCommand({ ...command, args: { operations: [] } }).valid).toBe(false);
    expect(validateCommand({ ...command, actor: { kind: 'agent', id: 'mock' } }).valid).toBe(false);
  });
});

const proposal = () => ({ proposalId: 'proposal_one', projectId: 'p', branchId: 'b', baseRevision: 0, agentRole: 'lore', scopeIds: ['layer_kael'], allowedOps: ['setLayerPose'], intent: 'repair_pose', message: '', operations: [{ op: 'setLayerPose', targetId: 'layer_kael', args: { pose: 'right' } }], evidenceNodeIds: ['layer_kael'], explanation: 'Offline demo', contextNodes: [{ id: 'layer_kael', kind: 'layer', value: { id: 'layer_kael' } }], contextDigest: 'a'.repeat(64), diff: [{ entityId: 'layer_kael', path: 'pose', before: 'left', after: 'right', beforePresent: true, afterPresent: true }], schemaVersionBefore: '0.1.0', schemaVersionAfter: '0.1.0', provider: 'local_mock', modelVersion: 'demo-v1', estimatedCost: { amount: 0, currency: 'USD' }, previewRef: null, status: 'pending_review', createdAt: '2026-11-12T00:00:00Z', reviewedAt: null, reviewedBy: null, approvalCommandId: null });
describe('proposal review records', () => {
  it('rejects expanded numeric wire size while accepting the shared safe numeric record', () => {
    expect(new TextEncoder().encode(JSON.stringify(numericBoundary.proposal)).length).toBeGreaterThan(131072);
    expect(validateProposal(numericBoundary.proposal).valid).toBe(false);
    const safe = structuredClone(numericBoundary.proposal);
    for (const node of safe.contextNodes) if (node.kind === 'layer') (node.value as { pose: string }).pose = 'x'.repeat(numericBoundary.safeBeforePoseLength);
    for (const entry of safe.diff) entry.before = 'x'.repeat(numericBoundary.safeBeforePoseLength);
    expect(validateProposal(safe).valid).toBe(true);
  });
  it('rejects the final-metadata overflow fixture and accepts bounded reviewed variants', () => {
    expect(validateProposal(metadataBoundary.proposal).valid).toBe(false);
    const safe = structuredClone(metadataBoundary.proposal);
    for (const node of safe.contextNodes) if (node.kind === 'layer') (node.value as { pose: string }).pose = 'x'.repeat(metadataBoundary.safeBeforePoseLength);
    for (const entry of safe.diff) entry.before = 'x'.repeat(metadataBoundary.safeBeforePoseLength);
    for (const status of ['pending_review', 'approved', 'rejected']) {
      const pending = status === 'pending_review';
      expect(validateProposal({ ...safe, status, reviewedAt: pending ? null : '\0'.repeat(64), reviewedBy: pending ? null : '\0'.repeat(128), approvalCommandId: status === 'approved' ? '\0'.repeat(128) : null }).valid).toBe(true);
    }
  });
  it('accepts the array-heavy record prepared by the Python domain within the same structural budget', () => {
    expect(validateProposalRequest(arrayBoundParity.request).valid).toBe(true);
    expect(validateProposal(arrayBoundParity.proposal).valid).toBe(true);
  });
  it('validates a complete bounded record', () => expect(validateProposal(proposal()).valid).toBe(true));
  it('rejects context, permissions, evidence and decision inconsistencies', () => {
    const base = proposal();
    for (const change of [{ evidenceNodeIds: ['other'] }, { contextNodes: [...base.contextNodes, ...base.contextNodes] }, { allowedOps: ['setLayerTransform'] }, { scopeIds: ['other'] }, { reviewedBy: 'creator' }, { status: 'approved' }, { status: 'rejected', reviewedBy: 'creator', reviewedAt: 'now', approvalCommandId: 'cmd_one' }]) expect(validateProposal({ ...base, ...change }).valid).toBe(false);
    expect(validateProposal({ ...base, status: 'approved', reviewedBy: 'creator', reviewedAt: 'now', approvalCommandId: 'cmd_one' }).valid).toBe(true);
  });
  it('bounds recursion, cycles, Unicode and nonfinite values before schema execution', () => {
    const cycle: Record<string, unknown> = {}; cycle.child = cycle;
    let deep: unknown = 0; for (let i = 0; i < 20000; i++) deep = [deep];
    for (const value of [cycle, deep, Infinity, '\ud800']) expect(validateProposal({ ...proposal(), contextNodes: [{ id: 'layer_kael', kind: 'layer', value }] }).valid).toBe(false);
    expect(validateProposalRequest({ ...request, message: 'Hello 🌍' }).valid).toBe(true);
    expect(validateProposalRequest({ ...request, requestId: 'r'.repeat(128), scopeIds: Array.from({ length: 8 }, (_, i) => `s${i}${'x'.repeat(120)}`), message: '🌍'.repeat(2000) }).valid).toBe(false);
  });
});
