import { afterEach, expect, it, vi } from 'vitest';
import sample from '../../../packages/schema/fixtures/sample.cdom.json';
import type { CdomDocument, ProposalRequest } from '@aether-dom/schema';
import { loadProposals, requestProposal, rejectProposal } from '../src/lib/proposal-api';
import { proxyProposalApi } from '../src/lib/proposal-proxy';

const request: ProposalRequest = { requestId: 'request_1', expectedRevision: 0, scopeIds: ['layer_kael'], allowedOps: ['setLayerTransform'], intent: 'move_right', message: 'Move the selected layer.' };
const document = sample as CdomDocument;
const proposal = {
  proposalId: 'proposal_one', projectId: sample.project.id, branchId: sample.project.activeBranchId, baseRevision: 0,
  agentRole: 'visual', scopeIds: request.scopeIds, allowedOps: request.allowedOps, intent: request.intent, message: request.message,
  operations: [{ op: 'setLayerTransform', targetId: 'layer_kael', args: { x: -.4 } }], evidenceNodeIds: ['layer_kael'], explanation: 'Mock layer adjustment.',
  contextNodes: [{ id: 'layer_kael', kind: 'layer', value: sample.layers[1] }], contextDigest: 'a'.repeat(64),
  diff: [{ entityId: 'layer_kael', path: 'transform.x', before: -.65, after: -.4, beforePresent: true, afterPresent: true }],
  schemaVersionBefore: '0.1.0', schemaVersionAfter: '0.1.0', provider: 'local_mock', modelVersion: 'mock-v1', estimatedCost: { amount: 0, currency: 'USD' }, previewRef: null,
  status: 'pending_review', createdAt: '2026-11-12T14:00:00Z', reviewedAt: null, reviewedBy: null, approvalCommandId: null,
};
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('loads persisted reviews and matches a generated response to the captured request', async () => {
  vi.stubGlobal('fetch', async () => Response.json({ proposals: [proposal] }));
  expect((await loadProposals(document))[0].proposalId).toBe(proposal.proposalId);
  const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => Response.json(proposal)); vi.stubGlobal('fetch', fetcher);
  expect((await requestProposal(document, request)).baseRevision).toBe(0);
  expect(String(fetcher.mock.calls[0][0])).toContain('/agent-proposals');
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual(request);
});
it('rejects mismatched identity, revision, scope and permissions before approval is available', async () => {
  for (const value of [{ ...proposal, projectId: 'other' }, { ...proposal, baseRevision: 1 }, { ...proposal, scopeIds: ['layer_vance'] }, { ...proposal, allowedOps: ['setLayerPose'] }, { ...proposal, message: 'Different request' }, { ...proposal, operations: [{ op: 'undo' }] }]) {
    vi.stubGlobal('fetch', async () => Response.json(value));
    await expect(requestProposal(document, request)).rejects.toThrow();
  }
});
it('rejects malformed decision responses and keeps unknown outcomes explicit', async () => {
  vi.stubGlobal('fetch', async () => Response.json(proposal));
  await expect(rejectProposal(document, proposal.proposalId)).rejects.toThrow();
  vi.stubGlobal('fetch', async () => Response.json({ ...proposal, status: 'rejected', reviewedAt: proposal.createdAt, reviewedBy: 'local_creator' }));
  expect((await rejectProposal(document, proposal.proposalId)).status).toBe('rejected');
  vi.stubGlobal('fetch', async () => { throw new Error('network'); });
  await expect(requestProposal(document, request)).rejects.toThrow(/Refresh proposals/i);
});
it('forwards only fixed proposal resources and rejects cross-origin JSON writes', async () => {
  const params = { projectId: sample.project.id, branchId: sample.project.activeBranchId };
  const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => Response.json(proposal)); vi.stubGlobal('fetch', fetcher);
  const bad = new Request('http://localhost/api/proposals', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' });
  expect((await proxyProposalApi(params, 'create', bad)).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  const good = new Request('http://localhost/api/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
  expect((await proxyProposalApi(params, 'create', good)).status).toBe(200);
  expect(String(fetcher.mock.calls[0][0])).toContain('/agent-proposals');
  expect((await proxyProposalApi(params, { rejectId: '..' }, good)).status).toBe(422);
});
