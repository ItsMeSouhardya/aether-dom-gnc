import Ajv2020 from 'ajv/dist/2020.js';
import proposalSchema from '../proposal.schema.json';
import requestSchema from '../proposal-request.schema.json';
import type { Proposal } from './proposal.generated';
import type { ProposalRequest } from './proposal-request.generated';
import type { ValidationIssue } from './index';

export type { Proposal, ProposalOperation, ProposalOpName } from './proposal.generated';
export type { ProposalRequest } from './proposal-request.generated';
const ajv = new Ajv2020({ allErrors: true, strict: true });
const proposalValidator = ajv.compile<Proposal>(proposalSchema);
const requestValidator = ajv.compile<ProposalRequest>(requestSchema);

/** Bound recursive JSON before schema evaluation, including cyclic hostile objects. */
function portable(value: unknown, byteLimit = 131072): boolean {
  const pending: [unknown, number][] = [[value, 0]];
  const seen = new Set<object>();
  let count = 0;
  while (pending.length) {
    const [item, depth] = pending.pop()!;
    if (++count > 4096 || depth > 16) return false;
    if (typeof item === 'number' && !Number.isFinite(item)) return false;
    if (typeof item === 'string' && /[\uD800-\uDFFF]/u.test(item)) return false;
    if (item !== null && typeof item === 'object') {
      if (seen.has(item)) return false;
      seen.add(item);
      if (Array.isArray(item)) {
        for (const child of item) pending.push([child, depth + 1]);
      } else {
        for (const [key, child] of Object.entries(item)) {
          pending.push([key, depth + 1], [child, depth + 1]);
        }
      }
    } else if (!['string', 'number', 'boolean'].includes(typeof item) && item !== null) return false;
  }
  return new TextEncoder().encode(JSON.stringify(value)).length <= byteLimit;
}
const issue = (): { valid: false; issues: ValidationIssue[] } => ({ valid: false, issues: [{ path: '/', message: 'Invalid bounded proposal contract' }] });

export function validateProposalRequest(value: unknown): { valid: true; request: ProposalRequest } | { valid: false; issues: ValidationIssue[] } {
  return portable(value, 8192) && requestValidator(value) ? { valid: true, request: value } : issue();
}

export function validateProposal(value: unknown): { valid: true; proposal: Proposal } | { valid: false; issues: ValidationIssue[] } {
  if (!portable(value) || !proposalValidator(value)) return issue();
  const ids = new Set(value.contextNodes.map(node => node.id));
  if (ids.size !== value.contextNodes.length || value.scopeIds.some(id => !ids.has(id))
    || value.evidenceNodeIds.some(id => !ids.has(id))
    || value.operations.some(op => !value.scopeIds.includes(op.targetId) || !value.allowedOps.includes(op.op))
    || value.diff.some(entry => !value.scopeIds.includes(entry.entityId))) return issue();
  const pending = value.status === 'pending_review';
  if (pending ? value.reviewedAt !== null || value.reviewedBy !== null || value.approvalCommandId !== null
    : value.reviewedAt === null || value.reviewedBy === null || (value.status === 'approved' ? value.approvalCommandId === null : value.approvalCommandId !== null)) return issue();
  return { valid: true, proposal: value };
}
