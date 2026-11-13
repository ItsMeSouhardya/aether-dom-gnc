import { afterEach, expect, it, vi } from 'vitest';
import sample from '../../../packages/schema/fixtures/sample.cdom.json';
import parity from '../../../packages/schema/fixtures/proposal-array-bound-parity.json';
import type { CdomDocument, Job } from '@aether-dom/schema';
import { cancelJob, enqueueJob, getJob, loadJobResult, loadJobs, retryJob } from '../src/lib/job-api';
import { proxyJobApi } from '../src/lib/job-proxy';

const document = sample as CdomDocument;
const request = { requestId: 'request_job_one', expectedRevision: 0, scopeIds: ['layer_kael'], allowedOps: ['setLayerTransform' as const], intent: 'move_right' as const, message: '' };
const job: Job = {
  jobId: 'job_one', projectId: document.project.id, branchId: document.project.activeBranchId,
  baseRevision: 0, request, inputHash: 'a'.repeat(64), provider: 'local_mock', modelVersion: 'deterministic-demo-v1',
  estimatedCost: { amount: 0, currency: 'USD' }, actualCost: null, status: 'queued', attempt: 0, maxAttempts: 3, progress: 0,
  createdAt: '2026-11-13T09:00:00+00:00', updatedAt: '2026-11-13T09:00:00+00:00', leaseExpiresAt: null, nextAttemptAt: null, error: null, result: null,
};
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('enqueues an exact request and rejects substituted job scope, revision or idempotency identity', async () => {
  const fetcher = vi.fn<(url: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => Response.json(job));
  vi.stubGlobal('fetch', fetcher);
  expect((await enqueueJob(document, request)).jobId).toBe('job_one');
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual(request);
  for (const bad of [{ ...job, branchId: 'elsewhere' }, { ...job, baseRevision: 1 }, { ...job, request: { ...request, requestId: 'other' } }, { ...job, request: { ...request, scopeIds: ['layer_vance'] } }]) {
    vi.stubGlobal('fetch', async () => Response.json(bad));
    await expect(enqueueJob(document, request)).rejects.toThrow();
  }
});
it('loads bounded branch-local history and checks exact resource and action identities', async () => {
  vi.stubGlobal('fetch', async () => Response.json({ jobs: [job] }));
  expect((await loadJobs(document)).map(item => item.jobId)).toEqual(['job_one']);
  vi.stubGlobal('fetch', async () => Response.json({ jobs: Array(21).fill(job) }));
  await expect(loadJobs(document)).rejects.toThrow();
  vi.stubGlobal('fetch', async () => Response.json({ ...job, jobId: 'another' }));
  await expect(getJob(document, 'job_one')).rejects.toThrow();
  vi.stubGlobal('fetch', async () => Response.json(job));
  await expect(cancelJob(document, job)).rejects.toThrow();
  const cancelled = { ...job, status: 'cancelled', error: { code: 'CANCELLED', message: 'Cancelled by creator', retryable: false } };
  vi.stubGlobal('fetch', async () => Response.json(cancelled));
  expect((await cancelJob(document, job)).status).toBe('cancelled');
  vi.stubGlobal('fetch', async () => Response.json({ ...job, status: 'failed', error: { code: 'EXPIRED', message: 'Retry', retryable: true } }));
  await expect(retryJob(document, job)).rejects.toThrow();
});
it('reports unknown mutation outcomes without silently generating another request', async () => {
  vi.stubGlobal('fetch', async () => { throw new Error('offline'); });
  await expect(enqueueJob(document, request)).rejects.toThrow(/unknown/i);
  vi.stubGlobal('fetch', async () => new Response('x', { headers: { 'Content-Type': 'text/html' } }));
  await expect(loadJobs(document)).rejects.toThrow();
});
it('classifies a locally rejected request as definite so the form can release its identity', async () => {
  await expect(enqueueJob(document, { ...request, message: '\0'.repeat(2000) })).rejects.toMatchObject({ definitelyRejected: true });
});
it('restricts job proxy paths, query, origin, method, JSON size and empty decisions', async () => {
  const params = { projectId: document.project.id, branchId: document.project.activeBranchId };
  const fetcher = vi.fn(async () => Response.json(job)); vi.stubGlobal('fetch', fetcher);
  const req = (body: unknown, extra: Record<string, string> = {}) => new Request('http://localhost/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) });
  expect((await proxyJobApi(params, 'create', req(request, { Origin: 'https://elsewhere.example' }))).status).toBe(403);
  expect((await proxyJobApi(params, { jobId: '..', action: 'get' }, new Request('http://localhost/api/jobs'))).status).toBe(422);
  expect((await proxyJobApi(params, 'list', new Request('http://localhost/api/jobs?path=secret'))).status).toBe(422);
  expect((await proxyJobApi(params, 'create', req(request, { 'Content-Type': 'text/plain' }))).status).toBe(415);
  expect((await proxyJobApi(params, { jobId: 'job_one', action: 'cancel' }, req({ evil: true }))).status).toBe(422);
  expect((await proxyJobApi(params, 'create', req({ ...request, message: 'x'.repeat(20000) }))).status).toBe(422);
  expect(fetcher).not.toHaveBeenCalled();
  expect((await proxyJobApi(params, 'create', req(request))).status).toBe(200);
});
it('forwards exact raw JSON so server duplicate-key checks cannot be bypassed', async () => {
  const raw = '{"requestId":"first","requestId":"second","expectedRevision":0,"scopeIds":["layer_kael"],"allowedOps":["setLayerTransform"],"intent":"move_right","message":""}';
  const fetcher = vi.fn<(url: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => Response.json({ detail: { message: 'Duplicate key' } }, { status: 422 }));
  vi.stubGlobal('fetch', fetcher);
  const response = await proxyJobApi({ projectId: document.project.id, branchId: document.project.activeBranchId }, 'create', new Request('http://localhost/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw }));
  expect(response.status).toBe(422);
  expect(fetcher.mock.calls[0][1]?.body).toBe(raw);
});
it('rejects reserved keys inside an otherwise valid job result before exposing review', async () => {
  const proposal = structuredClone(parity.proposal);
  const completed: Job = { ...job, request: parity.request as Job['request'], inputHash: proposal.contextDigest, modelVersion: proposal.modelVersion, status: 'succeeded', attempt: 1, progress: 100, actualCost: { amount: 0, currency: 'USD' }, result: { kind: 'proposal', proposalId: proposal.proposalId, sha256: 'b'.repeat(64) } };
  vi.stubGlobal('fetch', async () => Response.json(proposal));
  expect((await loadJobResult(document, completed)).proposalId).toBe(proposal.proposalId);
  proposal.contextNodes[0].value = JSON.parse('{"__proto__":{"forged":true}}');
  vi.stubGlobal('fetch', async () => Response.json(proposal));
  await expect(loadJobResult(document, completed)).rejects.toThrow();
});
