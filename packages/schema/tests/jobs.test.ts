import { describe, expect, it } from 'vitest';
import { validateJob, validateJobRequest } from '../src/index';
import cases from '../fixtures/job-cases.json';

const request = { requestId: 'req_one', expectedRevision: 0, scopeIds: ['layer_kael'], allowedOps: ['setLayerPose'], intent: 'repair_pose', message: '' };
const job = { jobId: 'job_one', projectId: 'proj_neon_shogun', branchId: 'branch_main', baseRevision: 0, request, inputHash: 'a'.repeat(64), provider: 'local_mock', modelVersion: 'deterministic-demo-v1', estimatedCost: { amount: 0, currency: 'USD' }, actualCost: null, status: 'queued', attempt: 0, maxAttempts: 3, progress: 0, createdAt: '2026-11-13T00:00:00+00:00', updatedAt: '2026-11-13T00:00:00+00:00', leaseExpiresAt: null, nextAttemptAt: null, error: null, result: null };

describe('durable jobs', () => {
  it.each([{ tail: 2, bytes: 8176, valid: true }, { tail: 3, bytes: 8177, valid: false }])('matches the server request budget at $bytes bytes', ({ tail, bytes, valid }) => {
    const value = { requestId: 'r', expectedRevision: 0, scopeIds: ['layer_kael'], allowedOps: ['setLayerTransform'], intent: 'move_right', message: '\0'.repeat(1340) + 'a'.repeat(tail) };
    expect(new TextEncoder().encode(JSON.stringify(value)).length).toBe(bytes);
    expect(validateJobRequest(value).valid).toBe(valid);
  });
  it.each(cases)('matches the shared cross-language case: $name', ({ value, valid }) => {
    expect(validateJob(value).valid).toBe(valid);
  });
  it('accepts an exact immutable request and queued job without changing either', () => {
    const before = JSON.stringify(job);
    expect(validateJobRequest(request).valid).toBe(true);
    expect(validateJob(job).valid).toBe(true);
    expect(JSON.stringify(job)).toBe(before);
  });
  it.each([
    { ...job, status: 'succeeded' }, { ...job, baseRevision: 1 },
    { ...job, leaseExpiresAt: job.createdAt }, { ...job, attempt: 3 },
    { ...job, createdAt: '2026-02-30T00:00:00Z' },
    { ...job, actualCost: { amount: 1, currency: 'USD' } },
    { ...job, request: { ...request, message: '\ud800' } },
    { ...job, request: { ...request, __proto__: { forged: true } } },
    { ...job, request: JSON.parse('{"__proto__":{},"requestId":"x"}') },
  ])('rejects inconsistent or hostile job state', invalid => {
    expect(validateJob(invalid).valid).toBe(false);
  });
  it('requires a live attempt and matching result metadata for success', () => {
    expect(validateJob({ ...job, attempt: 1, status: 'running', leaseExpiresAt: '2026-11-13T00:00:30Z' }).valid).toBe(true);
    expect(validateJob({ ...job, status: 'succeeded', attempt: 1, progress: 100, actualCost: { ...job.estimatedCost }, result: { kind: 'proposal', proposalId: 'proposal_one', sha256: 'b'.repeat(64) } }).valid).toBe(true);
    expect(validateJob({ ...job, status: 'failed', attempt: 3, actualCost: job.estimatedCost, error: { code: 'TIMEOUT', message: 'Failed', retryable: true } }).valid).toBe(false);
  });
});
