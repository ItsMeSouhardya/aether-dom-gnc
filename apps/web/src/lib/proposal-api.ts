import { validateProposal, validateProposalRequest, type CdomDocument, type Proposal, type ProposalRequest } from '@aether-dom/schema';
import { projectBase } from './project-api';
import { readProposalJson } from './proposal-json';

const path = (document: CdomDocument) => `${projectBase(document.project.id, document.project.activeBranchId)}/agent-proposals`;
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(value => b.includes(value));
function parse(value: unknown, document: CdomDocument): Proposal {
  const parsed = validateProposal(value);
  if (!parsed.valid || parsed.proposal.projectId !== document.project.id || parsed.proposal.branchId !== document.project.activeBranchId) throw new Error('The response does not match this project’s proposal contract. Refresh proposals.');
  return parsed.proposal;
}
async function requestJson(url: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try { response = await fetch(url, { method: body === undefined ? 'GET' : 'POST', ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000) }); }
  catch { throw new Error(body === undefined ? 'The proposal service is unavailable. Refresh proposals to retry.' : 'The request outcome is unknown. Refresh proposals before retrying.'); }
  let value: unknown;
  try { value = await readProposalJson(response); }
  catch { throw new Error('The proposal response was invalid. Refresh proposals before reviewing again.'); }
  if (!response.ok) {
    const detail = value && typeof value === 'object' && 'detail' in value ? value.detail : null;
    throw new Error(detail && typeof detail === 'object' && 'message' in detail && typeof detail.message === 'string' ? detail.message : 'The proposal request failed. Refresh proposals.');
  }
  return value;
}
export async function loadProposals(document: CdomDocument, signal?: AbortSignal): Promise<Proposal[]> {
  const value = await requestJson(path(document), undefined, signal);
  if (!value || typeof value !== 'object' || !('proposals' in value) || !Array.isArray(value.proposals) || value.proposals.length > 20) throw new Error('Invalid proposal history. Refresh proposals.');
  return value.proposals.map(item => parse(item, document));
}
export async function requestProposal(document: CdomDocument, request: ProposalRequest, signal?: AbortSignal): Promise<Proposal> {
  if (!validateProposalRequest(request).valid) throw new Error('Choose a valid scope, permissions and mock scenario.');
  const proposal = parse(await requestJson(path(document), request, signal), document);
  if (proposal.baseRevision !== request.expectedRevision || proposal.intent !== request.intent || proposal.message !== request.message || !sameSet(proposal.scopeIds, request.scopeIds) || !sameSet(proposal.allowedOps, request.allowedOps)) throw new Error('The proposal does not match the captured request. Refresh proposals.');
  return proposal;
}
export async function rejectProposal(document: CdomDocument, proposalId: string): Promise<Proposal> {
  if (!proposalId || proposalId === '.' || proposalId === '..') throw new Error('Invalid proposal identity.');
  const proposal = parse(await requestJson(`${path(document)}/${encodeURIComponent(proposalId)}/reject`, {}), document);
  if (proposal.proposalId !== proposalId || proposal.status !== 'rejected') throw new Error('The rejection was not confirmed. Refresh proposals.');
  return proposal;
}
