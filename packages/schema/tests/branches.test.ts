import { describe, expect, it } from 'vitest';
import * as contracts from '../src/index';
import cases from '../fixtures/branch-cases.json';

const command = { commandId: 'fork_1', op: 'forkBranch', projectId: 'project_1', sourceBranchId: 'main', expectedRevision: 7, newBranchId: 'child', name: '夜 🎬', actor: { kind: 'human', id: 'creator' }, reason: 'Explore' };
const branch = { id: 'child', name: '夜 🎬', parentId: 'main', baseRevision: 7, headRevision: 7 };
const root = { id: 'main', name: 'Main', parentId: null, baseRevision: 0, headRevision: 7 };
const diff = { projectId: 'project_1', base: { branchId: 'main', revision: 7 }, left: { branchId: 'main', revision: 8 }, right: { branchId: 'child', revision: 8 }, changes: [{ collection: 'layers', entityId: 'layer_1', path: '/transform/x', basePresent: true, leftPresent: true, rightPresent: true, base: 0, left: 1, right: 2, status: 'conflict' }], conflictCount: 1 };

describe('bounded branch contracts', () => {
  it('matches the shared Python contract cases', () => {
    const validators = { command: contracts.validateForkBranchCommand, list: contracts.validateBranchList, diff: contracts.validateBranchDiff };
    for (const entry of cases) expect(validators[entry.kind as keyof typeof validators](entry.value).valid, JSON.stringify(entry)).toBe(entry.valid);
  });
  it('exports validators and accepts typed human forks, lists and readonly diffs', () => {
    expect(contracts).toHaveProperty('validateForkBranchCommand');
    expect(contracts.validateForkBranchCommand(command)).toEqual({ valid: true, command });
    expect(contracts.validateBranchList({ projectId: 'project_1', branches: [branch, root] }).valid).toBe(true);
    expect(contracts.validateBranchDiff(diff)).toEqual({ valid: true, diff });
    const result = { branch, receipt: { commandId: 'fork_1', sourceBranchId: 'main', sourceRevision: 7, branchId: 'child', actor: command.actor, reason: command.reason, createdAt: '2026-11-13T00:00:00+00:00' } };
    expect(contracts.validateForkResult(result)).toEqual({ valid: true, result });
  });
  it.each([{ name: ' ' }, { name: '\u2003\t' }, { name: 'x'.repeat(81) }, { name: '\ud800' }, { newBranchId: '../bad' }, { newBranchId: 'branch_bad\n' }, { actor: { kind: 'agent', id: 'bot' } }, { expectedRevision: Infinity }, { expectedRevision: true }, { expectedRevision: 2 ** 53 }, { unexpected: 1 }])('rejects malformed forks %j', extra => {
    expect(contracts.validateForkBranchCommand({ ...command, ...extra }).valid).toBe(false);
  });
  it('counts astral name scalars and rejects malformed list identities and lineage', () => {
    expect(contracts.validateBranchList({ projectId: 'project_1', branches: [] }).valid).toBe(true);
    expect(contracts.validateForkBranchCommand({ ...command, name: '🎬'.repeat(80) }).valid).toBe(true);
    for (const branches of [[branch, branch], [{ ...branch, headRevision: 6 }], [{ ...branch, parentId: 'child' }], Array.from({ length: 65 }, (_, i) => ({ ...branch, id: `b_${i}` }))]) {
      expect(contracts.validateBranchList({ projectId: 'project_1', branches }).valid).toBe(false);
    }
  });
  it('validates fork receipt provenance and never accepts an advanced replay summary', () => {
    const result = { branch, receipt: { commandId: 'fork_1', sourceBranchId: 'main', sourceRevision: 7, branchId: 'child', actor: command.actor, reason: command.reason, createdAt: '2026-11-13T00:00:00+00:00' } };
    for (const value of [ { ...result, branch: { ...branch, headRevision: 8 } }, { ...result, receipt: { ...result.receipt, sourceRevision: 6 } }, { ...result, receipt: { ...result.receipt, branchId: 'other' } }, { ...result, receipt: { ...result.receipt, actor: { kind: 'agent', id: 'bot' } } }, { ...result, receipt: { ...result.receipt, createdAt: 'invalid' } } ]) expect(contracts.validateForkResult(value).valid).toBe(false);
  });
  it('checks counts, duplicate paths, status, presence, nonfinite and JSON bounds', () => {
    for (const changed of [ { ...diff, conflictCount: 0 }, { ...diff, changes: [...diff.changes, ...diff.changes], conflictCount: 2 }, { ...diff, changes: [{ ...diff.changes[0], status: 'same_change' }] }, { ...diff, changes: [{ ...diff.changes[0], basePresent: false, base: 0 }] }, { ...diff, changes: [{ ...diff.changes[0], left: NaN }] }, { ...diff, changes: [{ ...diff.changes[0], right: '\ud800' }] }, { ...diff, changes: [{ ...diff.changes[0], right: 'x'.repeat(1048576) }] } ]) {
      expect(contracts.validateBranchDiff(changed).valid).toBe(false);
    }
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
    expect(contracts.validateBranchDiff(cyclic).valid).toBe(false);
  });
});
