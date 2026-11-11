import { describe, expect, it } from 'vitest';
import { parseTransformDraft, makeCommand } from '../src/features/commands/draft';
import sample from '../../../packages/schema/fixtures/sample.cdom.json';
import type { CdomDocument } from '@aether-dom/schema';

const values = { x: '-0.25', y: '0', z: '-2', scale: '1.5', rotationDeg: '45' };
describe('transform drafts', () => {
  it('parses explicit finite values without changing document canon', () => {
    expect(parseTransformDraft(values)).toEqual({ valid: true, transform: { x: -0.25, y: 0, z: -2, scale: 1.5, rotationDeg: 45 } });
  });
  it.each(['', ' ', 'Infinity', 'NaN', '1e400'])('rejects an invalid number %j', x => {
    expect(parseTransformDraft({ ...values, x }).valid).toBe(false);
  });
  it.each(['0', '-0.1'])('rejects scale %s', scale => {
    expect(parseTransformDraft({ ...values, scale }).valid).toBe(false);
  });
  it('binds an operation to the displayed revision and stable IDs', () => {
    const document = structuredClone(sample) as CdomDocument;
    document.project.revision = 5;
    const command = makeCommand(document, { op: 'setLayerTransform', targetId: 'layer_kael', args: { x: 0.2 } }, 'Move Kael');
    expect(command).toMatchObject({ projectId: 'proj_neon_shogun', branchId: 'branch_main', expectedRevision: 5, actor: { kind: 'human', id: 'local_creator' } });
    expect(command.commandId).toBeTruthy();
    expect(document.layers[1].transform.x).toBe(-0.65);
  });
});
