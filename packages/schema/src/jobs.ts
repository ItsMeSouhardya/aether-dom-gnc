import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../job.schema.json';
import requestSchema from '../job-request.schema.json';
import type { Job } from './job.generated';
import type { JobRequest } from './job-request.generated';
import type { ValidationIssue } from './index';

export type { Job } from './job.generated';
export type { JobRequest } from './job-request.generated';
const ajv = new Ajv2020({ allErrors: true, strict: true });
const jobValidator = ajv.compile<Job>(schema);
const requestValidator = ajv.compile<JobRequest>(requestSchema);
const issue = (): { valid: false; issues: ValidationIssue[] } => ({ valid: false, issues: [{ path: '/', message: 'Invalid bounded job contract' }] });

function portable(value: unknown, limit: number): boolean {
  const pending: [unknown, number][] = [[value, 0]];
  const seen = new Set<object>();
  let nodes = 0;
  while (pending.length) {
    const [item, depth] = pending.pop()!;
    if (++nodes > 4096 || depth > 16) return false;
    if (typeof item === 'number' && !Number.isFinite(item)) return false;
    if (typeof item === 'string' && /[\uD800-\uDFFF]/u.test(item)) return false;
    if (item !== null && typeof item === 'object') {
      if (seen.has(item)) return false;
      seen.add(item);
      if (Array.isArray(item)) for (const child of item) pending.push([child, depth + 1]);
      else {
        if (Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) return false;
        for (const [key, child] of Object.entries(item)) {
          if (['__proto__', 'prototype', 'constructor'].includes(key)) return false;
          pending.push([key, depth + 1], [child, depth + 1]);
        }
      }
    } else if (item !== null && !['string', 'number', 'boolean'].includes(typeof item)) return false;
  }
  return new TextEncoder().encode(JSON.stringify(value)).length <= limit;
}

function timestamp(value: string): boolean {
  const parsed = new Date(value);
  return Number(value.slice(0, 4)) > 0 && Number.isFinite(parsed.getTime())
    && parsed.toISOString().slice(0, 19) === value.slice(0, 19);
}

// Keep Python's full microsecond precision; Date.parse truncates to milliseconds.
function timeKey(value: string): string {
  const fraction = value.slice(19).match(/^\.([0-9]+)/u)?.[1] ?? '';
  return `${value.slice(0, 19)}.${fraction.padEnd(6, '0')}`;
}

export function validateJobRequest(value: unknown): { valid: true; request: JobRequest } | { valid: false; issues: ValidationIssue[] } {
  // Python's shared proposal guard reserves16 bytes for the request's one
  // numeric field. Match that conservative boundary for safe integer revisions.
  return portable(value, 8176) && requestValidator(value) ? { valid: true, request: value } : issue();
}

export function validateJob(value: unknown): { valid: true; job: Job } | { valid: false; issues: ValidationIssue[] } {
  if (!portable(value, 32768) || !jobValidator(value) || !validateJobRequest(value.request).valid) return issue();
  const job = value;
  if (job.baseRevision !== job.request.expectedRevision
    || [job.createdAt, job.updatedAt, job.leaseExpiresAt, job.nextAttemptAt].some(time => time !== null && !timestamp(time))
    || timeKey(job.updatedAt) < timeKey(job.createdAt)) return issue();
  const { status, attempt, error, result, actualCost, leaseExpiresAt, nextAttemptAt, progress } = job;
  if (status === 'running') {
    if (attempt < 1 || leaseExpiresAt === null || timeKey(leaseExpiresAt) <= timeKey(job.updatedAt)
      || nextAttemptAt !== null || error !== null || result !== null || actualCost !== null || progress >= 100) return issue();
  } else if (leaseExpiresAt !== null) return issue();
  if (status === 'queued' && (attempt >= 3 || error !== null || result !== null || actualCost !== null || nextAttemptAt !== null || progress >= 100)) return issue();
  if (status === 'succeeded' && (attempt < 1 || result === null || error !== null || actualCost === null || progress !== 100 || nextAttemptAt !== null)) return issue();
  if (status === 'failed' && (attempt < 1 || error === null || result !== null || actualCost === null || progress >= 100
    || (attempt >= 3 && error.retryable) || (nextAttemptAt !== null && (!error.retryable || timeKey(nextAttemptAt) <= timeKey(job.updatedAt))))) return issue();
  if (['cancelled', 'stale'].includes(status) && (result !== null || nextAttemptAt !== null || progress >= 100
    || error === null || error.retryable || (attempt > 0 ? actualCost === null : actualCost !== null))) return issue();
  return { valid: true, job };
}
