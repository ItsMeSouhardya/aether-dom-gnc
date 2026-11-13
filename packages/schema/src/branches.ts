import Ajv2020 from 'ajv/dist/2020.js';
import forkSchema from '../fork-branch.schema.json';
import listSchema from '../branch-list.schema.json';
import diffSchema from '../branch-diff.schema.json';
import resultSchema from '../fork-result.schema.json';
import type { ForkBranchCommand } from './fork-branch.generated';
import type { BranchList, BranchSummary } from './branch-list.generated';
import type { ThreeWayDiff, BranchChange } from './branch-diff.generated';
import type { ForkResult } from './fork-result.generated';
import type { ValidationIssue } from './index';

export type { ForkBranchCommand, BranchList, BranchSummary, ThreeWayDiff, BranchChange, ForkResult };
export type ForkBranchResult = ForkResult;
const ajv = new Ajv2020({ allErrors: true, strict: true });
const forkValidator = ajv.compile<ForkBranchCommand>(forkSchema);
const listValidator = ajv.compile<BranchList>(listSchema);
const diffValidator = ajv.compile<ThreeWayDiff>(diffSchema);
const resultValidator = ajv.compile<ForkResult>(resultSchema);
type Invalid = { valid: false; issues: ValidationIssue[] };
const invalid = (): Invalid => ({ valid: false, issues: [{ path: '/', message: 'Invalid bounded branch contract' }] });

/** Reject hostile JS objects before AJV recursion/stringification. UTF-8 scalars only. */
function bounded(value: unknown, bytes: number): boolean {
  const pending: [unknown, number][] = [[value, 0]];
  const seen = new Set<object>();
  let count = 0;
  while (pending.length) {
    const [child, depth] = pending.pop()!;
    if (++count > 200000 || depth > 32) return false;
    if (typeof child === 'string' && /[\uD800-\uDFFF]/u.test(child)) return false;
    if (typeof child === 'number' && !Number.isFinite(child)) return false;
    if (child !== null && typeof child === 'object') {
      if (seen.has(child) || (!Array.isArray(child) && Object.getPrototypeOf(child) !== Object.prototype && Object.getPrototypeOf(child) !== null)) return false;
      seen.add(child);
      if (Array.isArray(child)) {
        for (const item of child) pending.push([item, depth + 1]);
      } else for (const [key, item] of Object.entries(child)) pending.push([key, depth + 1], [item, depth + 1]);
    } else if (child !== null && !['string', 'number', 'boolean'].includes(typeof child)) return false;
  }
  return new TextEncoder().encode(JSON.stringify(value)).length <= bytes;
}
const whitespace = /^[\s\u0085]+$/u;
function validSummary(branch: BranchSummary): boolean {
  return !whitespace.test(branch.name) && branch.baseRevision <= branch.headRevision && branch.id !== branch.parentId;
}

export function validateForkBranchCommand(value: unknown): { valid: true; command: ForkBranchCommand } | Invalid {
  return bounded(value, 8192) && forkValidator(value) && !whitespace.test(value.name)
    && value.newBranchId !== value.sourceBranchId ? { valid: true, command: value } : invalid();
}

export function validateBranchList(value: unknown): { valid: true; branchList: BranchList } | Invalid {
  if (!bounded(value, 131072) || !listValidator(value)) return invalid();
  const map = new Map(value.branches.map(branch => [branch.id, branch]));
  if (map.size !== value.branches.length || value.branches.some(branch => !validSummary(branch))) return invalid();
  for (const branch of value.branches) {
    const seen = new Set<string>();
    let current: BranchSummary | undefined = branch;
    while (current) {
      if (seen.has(current.id)) return invalid();
      seen.add(current.id);
      if (current.parentId === null) break;
      const parent = map.get(current.parentId);
      if (!parent || parent.baseRevision > current.baseRevision || parent.headRevision < current.baseRevision) return invalid();
      current = parent;
    }
  }
  return { valid: true, branchList: value };
}

function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a).sort();
  const otherKeys = Object.keys(b).sort();
  return keys.length === otherKeys.length && keys.every((key, i) => key === otherKeys[i] && equal((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}
function expectedStatus(change: BranchChange): BranchChange['status'] | null {
  const same = (a: 'base' | 'left' | 'right', b: 'base' | 'left' | 'right') => change[`${a}Present`] === change[`${b}Present`] && equal(change[a], change[b]);
  const left = !same('base', 'left');
  const right = !same('base', 'right');
  return left && right ? (same('left', 'right') ? 'same_change' : 'conflict') : left ? 'left_only' : right ? 'right_only' : null;
}

export function validateBranchDiff(value: unknown): { valid: true; diff: ThreeWayDiff } | Invalid {
  if (!bounded(value, 1048576) || !diffValidator(value)) return invalid();
  if (value.base.revision > value.left.revision || value.base.revision > value.right.revision
    || (value.left.branchId === value.right.branchId && (value.left.revision !== value.right.revision || value.changes.length !== 0))) return invalid();
  const paths = new Set<string>();
  for (const change of value.changes) {
    const key = JSON.stringify([change.collection, change.entityId, change.path]);
    if (paths.has(key) || expectedStatus(change) !== change.status
      || (!change.basePresent && change.base !== null) || (!change.leftPresent && change.left !== null) || (!change.rightPresent && change.right !== null)
      || (['document', 'project', 'provenance'].includes(change.collection) && change.entityId !== value.projectId)) return invalid();
    paths.add(key);
  }
  return value.conflictCount === value.changes.filter(change => change.status === 'conflict').length ? { valid: true, diff: value } : invalid();
}

export function validateForkResult(value: unknown): { valid: true; result: ForkResult } | Invalid {
  if (!bounded(value, 16384) || !resultValidator(value)) return invalid();
  const { branch, receipt } = value;
  return validSummary(branch) && branch.parentId === receipt.sourceBranchId && branch.id === receipt.branchId
    && branch.baseRevision === receipt.sourceRevision && branch.headRevision === receipt.sourceRevision
    && Number.isFinite(Date.parse(receipt.createdAt)) ? { valid: true, result: value } : invalid();
}
export const validateForkBranchResult = validateForkResult;
