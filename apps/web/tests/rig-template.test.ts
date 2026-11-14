import { expect, it } from 'vitest';
import { parseRigTemplate, instantiateRig } from '../src/features/rig/template';
import { validateCommand } from '@aether-dom/schema';

const template = { templateVersion: '1.0.0', name: 'Original', svg: '<svg/>', rig: { id: 'rig', name: 'Rig', bones: [{ id: 'root', name: 'Root', parentId: null, rest: { x: 0, y: 0, rotationDeg: 0 }, rotationDeg: 0, limb: null, action: null }], attachments: [{ id: 'slot', name: 'Slot', boneId: 'root', elementId: 'part' }] } };
it('validates template shape and remaps canonical identities without changing source IDs', () => {
  const parsed = parseRigTemplate(template), first = instantiateRig(parsed, 'one'), second = instantiateRig(parsed, 'two');
  expect(first.rig.id).not.toBe(second.rig.id);
  expect(first.rig.attachments[0].boneId).toBe(first.rig.bones[0].id);
  expect(first.rig.attachments[0].elementId).toBe('part');
  expect(template.rig.id).toBe('rig');
  expect(validateCommand({ commandId: 'cmd', projectId: 'project', branchId: 'branch', expectedRevision: 0, actor: { kind: 'human', id: 'creator' }, reason: 'Import', op: 'importRigLayer', targetId: 'shot', args: { ...first, characterId: 'character', rights: 'project_original' } }).valid).toBe(true);
  expect(() => parseRigTemplate({ ...template, svg: 'x'.repeat(256 * 1024 + 1) })).toThrow();
  expect(() => parseRigTemplate({ ...template, rig: { ...template.rig, bones: [] } })).toThrow();
});
