import { expect, it } from 'vitest';
import { validateCommand } from '../src/commands';

const base = { commandId: 'cmd_pose', projectId: 'proj_neon_shogun', branchId: 'branch_main', expectedRevision: 3, actor: { kind: 'human', id: 'local_creator' }, reason: 'Repair continuity' };
it.each(['lifting_with_right_arm', null])('accepts explicit pose %s', pose => {
  expect(validateCommand({ ...base, op: 'setLayerPose', targetId: 'layer_kael', args: { pose } }).valid).toBe(true);
});
it('accepts a revision-bound recovery event', () => {
  expect(validateCommand({ ...base, op: 'recordConstraintRecovery', targetId: 'constraint_kael_left_arm', args: { eventId: 'event_recovery', sceneId: 'scene_rooftop', order: 2, description: 'Kael recovers after treatment.' } }).valid).toBe(true);
});
it.each([
  { op: 'setLayerPose', targetId: 'layer_kael', args: { pose: '\ud800' } },
  { op: 'setLayerPose', targetId: 'layer_kael', args: { pose: 'standing' }, reason: '\udfff' },
  { op: 'recordConstraintRecovery', targetId: 'constraint_kael_left_arm', args: { eventId: 'recovery', sceneId: 'scene_rooftop', order: 2, description: '\ud800' } },
])('rejects non-scalar Unicode before it can poison a saved branch %#', operation => {
  expect(validateCommand({ ...base, ...operation }).valid).toBe(false);
});
it('accepts valid supplementary Unicode in authored text', () => {
  expect(validateCommand({ ...base, op: 'setLayerPose', targetId: 'layer_kael', args: { pose: 'standing 🦾' } }).valid).toBe(true);
});
it.each([
  { op: 'setLayerPose', targetId: 'layer_kael', args: { pose: '' } },
  { op: 'setLayerPose', targetId: 'layer_kael', args: { pose: 42 } },
  { op: 'setLayerPose', targetId: 'layer_kael', args: { pose: 'standing', transform: {} } },
  ...[-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1].map(order => ({ op: 'recordConstraintRecovery', targetId: 'constraint_kael_left_arm', args: { eventId: 'event_recovery', sceneId: 'scene_rooftop', order, description: 'Recovery' } })),
  { op: 'recordConstraintRecovery', targetId: 'constraint_kael_left_arm', args: { eventId: '', sceneId: 'scene_rooftop', order: 2, description: 'Recovery' } },
])('rejects malformed lore command %#', operation => {
  expect(validateCommand({ ...base, ...operation }).valid).toBe(false);
});
