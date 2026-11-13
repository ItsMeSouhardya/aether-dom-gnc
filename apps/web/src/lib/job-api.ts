import { validateJob, validateJobRequest, validateProposal, type CdomDocument, type Job, type JobRequest, type Proposal } from '@aether-dom/schema';
import { projectBase } from './project-api';
import { readProposalJson } from './proposal-json';

const base = (document: CdomDocument) => `${projectBase(document.project.id, document.project.activeBranchId)}/jobs`;
const identity = (id: string) => /^[A-Za-z0-9_-]{1,128}$/.test(id);
const same = (a: string[], b: string[]) => a.length === b.length && a.every(item => b.includes(item));
const sameRequest = (a: JobRequest, b: JobRequest) => a.requestId === b.requestId && a.expectedRevision === b.expectedRevision && a.intent === b.intent && a.message === b.message && same(a.scopeIds, b.scopeIds) && same(a.allowedOps, b.allowedOps);
export class JobRequestError extends Error {
  constructor(message: string, readonly definitelyRejected: boolean) { super(message); }
}

function parse(value: unknown, document: CdomDocument, jobId?: string): Job {
  const result = validateJob(value);
  if (!result.valid || result.job.projectId !== document.project.id || result.job.branchId !== document.project.activeBranchId || jobId !== undefined && result.job.jobId !== jobId) throw new Error('The job response does not match this branch or resource. Refresh jobs.');
  return result.job;
}
async function json(url: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { method: body === undefined ? 'GET' : 'POST', ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000) });
  } catch { throw new Error(body === undefined ? 'Job history is unavailable. Refresh jobs to retry.' : 'The request outcome is unknown. Refresh jobs, then retry the same request.'); }
  let value: unknown;
  try { value = await readProposalJson(response, 1024 * 1024); }
  catch { throw new Error('The job response is invalid. Refresh jobs before continuing.'); }
  if (!response.ok) {
    const detail = value && typeof value === 'object' && 'detail' in value ? value.detail : null;
    throw new JobRequestError(detail && typeof detail === 'object' && 'message' in detail && typeof detail.message === 'string' ? detail.message : 'The job request failed. Refresh jobs.', [400, 401, 403, 404, 405, 409, 413, 415, 422].includes(response.status));
  }
  return value;
}
export async function loadJobs(document: CdomDocument, signal?: AbortSignal): Promise<Job[]> {
  const value = await json(base(document), undefined, signal);
  if (!value || typeof value !== 'object' || !('jobs' in value) || !Array.isArray(value.jobs) || value.jobs.length > 20) throw new Error('Invalid job history. Refresh jobs.');
  const jobs = value.jobs.map(item => parse(item, document));
  if (new Set(jobs.map(item => item.jobId)).size !== jobs.length) throw new Error('Duplicate job records. Refresh jobs.');
  return jobs;
}
export async function enqueueJob(document: CdomDocument, request: JobRequest, signal?: AbortSignal): Promise<Job> {
  if (!validateJobRequest(request).valid) throw new JobRequestError('Choose a valid bounded job scope, scenario and message.', true);
  const job = parse(await json(base(document), request, signal), document);
  if (!sameRequest(job.request, request) || job.baseRevision !== request.expectedRevision) throw new Error('The job does not match the captured request. Refresh jobs.');
  return job;
}
export async function getJob(document: CdomDocument, jobId: string, signal?: AbortSignal): Promise<Job> {
  if (!identity(jobId)) throw new Error('Invalid job identity.');
  return parse(await json(`${base(document)}/${jobId}`, undefined, signal), document, jobId);
}
async function change(document: CdomDocument, job: Job, action: 'cancel' | 'retry', signal?: AbortSignal): Promise<Job> {
  if (!identity(job.jobId)) throw new Error('Invalid job identity.');
  const saved = parse(await json(`${base(document)}/${job.jobId}/${action}`, {}, signal), document, job.jobId);
  if (!sameRequest(saved.request, job.request) || (action === 'cancel' ? !['cancelled', 'succeeded', 'failed', 'stale'].includes(saved.status) : !['queued', 'running', 'succeeded'].includes(saved.status))) throw new Error('The job decision was not confirmed. Refresh jobs.');
  return saved;
}
export const cancelJob = (document: CdomDocument, job: Job, signal?: AbortSignal) => change(document, job, 'cancel', signal);
export const retryJob = (document: CdomDocument, job: Job, signal?: AbortSignal) => change(document, job, 'retry', signal);
function safeResultValues(value: unknown): boolean {
  const pending: unknown[] = [value]; let count = 0;
  while (pending.length) {
    if (++count > 4096) return false;
    const item = pending.pop();
    if (item && typeof item === 'object') {
      if (Array.isArray(item)) pending.push(...item);
      else for (const [key, child] of Object.entries(item)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) return false;
        pending.push(child);
      }
    }
  }
  return true;
}
export async function loadJobResult(document: CdomDocument, job: Job, signal?: AbortSignal): Promise<Proposal> {
  if (!identity(job.jobId) || job.status !== 'succeeded' || !job.result) throw new Error('This job has no completed result to review.');
  const value = await json(`${base(document)}/${job.jobId}/result`, undefined, signal);
  if (!safeResultValues(value)) throw new Error('The job result contains unsupported JSON values. Refresh jobs.');
  const parsed = validateProposal(value);
  if (!parsed.valid || parsed.proposal.proposalId !== job.result.proposalId || parsed.proposal.projectId !== document.project.id || parsed.proposal.branchId !== document.project.activeBranchId || parsed.proposal.baseRevision !== job.baseRevision || !same(parsed.proposal.scopeIds, job.request.scopeIds) || !same(parsed.proposal.allowedOps, job.request.allowedOps) || parsed.proposal.intent !== job.request.intent || parsed.proposal.message !== job.request.message || parsed.proposal.contextDigest !== job.inputHash || parsed.proposal.provider !== job.provider || parsed.proposal.modelVersion !== job.modelVersion) throw new Error('The result does not match this job. Refresh jobs before reviewing.');
  return parsed.proposal;
}
