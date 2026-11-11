import { describe, expect, it } from 'vitest';
import { validateCommand } from '../src/commands';

const base = { commandId: 'cmd_one', projectId: 'proj_neon_shogun', branchId: 'branch_main', expectedRevision: 0, actor: { kind: 'human', id: 'local_creator' }, reason: 'Move Kael' };
describe('typed canonical commands', () => {
  it('accepts a partial transform without adding defaults or mutating input', () => {
    const command = { ...base, op: 'setLayerTransform', targetId: 'layer_kael', args: { x: -0.25 } };
    const before = JSON.stringify(command);
    expect(validateCommand(command).valid).toBe(true);
    expect(JSON.stringify(command)).toBe(before);
  });
  it.each(['undo', 'redo'])('accepts the revision-bound %s action', op => {
    expect(validateCommand({ ...base, op }).valid).toBe(true);
  });
  it.each([
    { op: 'arbitraryPatch' },
    { op: 'setLayerTransform', targetId: 'layer_kael', args: {} },
    { op: 'setLayerTransform', targetId: 'layer_kael', args: { scale: 0 } },
    { op: 'setLayerTransform', targetId: 'layer_kael', args: { x: '1' } },
    { op: 'setLayerTransform', targetId: 'layer_kael', args: { x: Infinity } },
    { op: 'setLayerTransform', targetId: 'layer_kael', args: { y: NaN } },
    { op: 'undo', args: { x: 1 } },
    { op: 'redo', targetId: 'layer_kael' },
    { op: 'undo', expectedRevision: -1 },
    { op: 'undo', expectedRevision: '0' },
    { op: 'undo', actor: { kind: 'agent', id: 'bot' } },
    { op: 'undo', uiState: {} },
    { op: 'undo', commandId: '' },
  ])('rejects invalid operation %#', invalid => {
    expect(validateCommand({ ...base, ...invalid }).valid).toBe(false);
  });
});
