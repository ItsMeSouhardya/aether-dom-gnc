import { expect, it } from 'vitest';
import { stageRenderPlan } from '../src/features/stage/render-plan';

it('poses a rig at each requested time without mutating its source or flat layers', () => {
  const svg = { assetId: 'asset', uri: 'a.svg', sourceUri: 'a.svg', viewBox: { x: 0, y: 0, width: 100, height: 100 }, root: { tag: 'svg' as const, id: 'svg', attributes: {}, text: '', children: [{ tag: 'g' as const, id: 'part', attributes: {}, text: '', children: [] }] } };
  const rig = { id: 'rig', name: 'Rig', bones: [{ id: 'bone', name: 'Bone', parentId: null, rest: { x: 10, y: 10, rotationDeg: 0 }, rotationDeg: 0, limb: null, action: null, keyframes: [{ id: 'frame', timeMs: 1000, rotationDeg: 90 }] }], attachments: [{ id: 'slot', name: 'Slot', boneId: 'bone', elementId: 'part' }] };
  const transform = { x: 0, y: 0, z: 0, scale: 1, rotationDeg: 0 };
  const layers = [{ id: 'rigged', transform, svg, rig }, { id: 'flat', transform, svg }];
  const before = JSON.stringify(layers);
  const start = stageRenderPlan(layers, 0, true), end = stageRenderPlan(layers, 1000, true);
  expect(start[0].svg!.root.children[0].attributes).not.toEqual(end[0].svg!.root.children[0].attributes);
  expect(start[1].svg).toBe(svg);
  expect(JSON.stringify(layers)).toBe(before);
  const preview = stageRenderPlan(layers, 1000, true, null, { layerId: 'rigged', boneId: 'bone', rotationDeg: 45 });
  expect(preview[0].svg!.root.children[0].attributes).not.toEqual(end[0].svg!.root.children[0].attributes);
  expect(JSON.stringify(layers)).toBe(before);
  const broken = stageRenderPlan([{ ...layers[0], rig: { ...rig, attachments: [{ ...rig.attachments[0], elementId: 'missing' }] } }], 0, true);
  expect(broken[0]).toMatchObject({ svg: null, rigError: true });
});
