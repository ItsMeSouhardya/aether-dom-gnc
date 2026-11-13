import { validateBranchDiff, validateBranchList, validateForkBranchCommand, validateForkBranchResult, type ForkBranchCommand, type ForkBranchResult, type BranchSummary, type ThreeWayDiff } from '@aether-dom/schema';
import { safeRouteId } from '../features/studio/scope';
import { readBranchJson } from './branch-json';
export class BranchApiError extends Error {
  constructor(message: string, public status: number, public unknownOutcome: boolean) { super(message); this.name = 'BranchApiError'; }
}
const root = (projectId: string) => {
  if (!safeRouteId(projectId)) throw new BranchApiError('Invalid project address.', 422, false);
  return `/api/v1/projects/${encodeURIComponent(projectId)}`;
};
async function request(path: string, init?: RequestInit, signal?: AbortSignal) {
  const writing = init?.method === 'POST'; let response: Response;
  try { response = await fetch(path, { ...init, cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) }); }
  catch (error) {
    if (signal?.aborted) throw error;
    throw new BranchApiError(writing ? 'Fork outcome is unknown. Refresh branches or retry this same fork.' : 'The local branch service is unavailable. Check the API and retry.', 0, writing);
  }
  let value: unknown;
  try { value = await readBranchJson(response); }
  catch { throw new BranchApiError(writing ? 'The fork response was invalid. Refresh branches or retry the same fork.' : 'The branch response was invalid or exceeded its limit.', response.status, writing); }
  if (!response.ok) {
    const detail = value && typeof value === 'object' && 'detail' in value ? value.detail : null;
    const message = detail && typeof detail === 'object' && 'message' in detail && typeof detail.message === 'string' ? detail.message : 'The branch operation failed. Refresh and try again.';
    throw new BranchApiError(message, response.status, writing && response.status >= 500);
  }
  return value;
}
export async function listBranches(projectId: string, signal?: AbortSignal): Promise<BranchSummary[]> {
  const parsed = validateBranchList(await request(`${root(projectId)}/branches`, undefined, signal));
  if (!parsed.valid || parsed.branchList.projectId !== projectId) throw new BranchApiError('The branch list does not match this project.', 502, false);
  return parsed.branchList.branches;
}
export async function forkBranch(value: unknown, signal?: AbortSignal): Promise<ForkBranchResult> {
  const command = validateForkBranchCommand(value);
  if (!command.valid) throw new BranchApiError('The fork command is invalid. Check its name and identities.', 422, false);
  const expected: ForkBranchCommand = command.command;
  const parsed = validateForkBranchResult(await request(`${root(expected.projectId)}/branches`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(expected) }, signal));
  if (!parsed.valid || parsed.result.branch.id !== expected.newBranchId || parsed.result.branch.parentId !== expected.sourceBranchId
    || parsed.result.branch.name !== expected.name || parsed.result.branch.baseRevision !== expected.expectedRevision
    || parsed.result.receipt.commandId !== expected.commandId || parsed.result.receipt.sourceBranchId !== expected.sourceBranchId
    || parsed.result.receipt.sourceRevision !== expected.expectedRevision || parsed.result.receipt.branchId !== expected.newBranchId
    || parsed.result.receipt.actor.id !== expected.actor.id || parsed.result.receipt.reason !== expected.reason) throw new BranchApiError('The fork response did not match this command. Refresh branches or retry the same fork.', 502, true);
  return parsed.result;
}
export async function compareBranches(projectId: string, left: string, right: string, signal?: AbortSignal): Promise<ThreeWayDiff> {
  if (![left, right].every(safeRouteId)) throw new BranchApiError('Choose two valid branch IDs.', 422, false);
  const parsed = validateBranchDiff(await request(`${root(projectId)}/diff?${new URLSearchParams({ left, right })}`, undefined, signal));
  if (!parsed.valid || parsed.diff.projectId !== projectId || parsed.diff.left.branchId !== left || parsed.diff.right.branchId !== right) throw new BranchApiError('The comparison does not match the requested branches.', 502, false);
  return parsed.diff;
}
