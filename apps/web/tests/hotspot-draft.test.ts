import { expect, it } from 'vitest';
import fixture from '../../../packages/schema/fixtures/sample.cdom.json';
import type { CdomDocument, LoreHotspot } from '@aether-dom/schema';
import { draftValue, makeHotspotDraft } from '../src/features/hotspots/draft';

it('captures independent before values and validates percentage inputs and references', () => {
  const document = structuredClone(fixture) as unknown as CdomDocument;
  const hotspot: LoreHotspot = { id: 'spot', label: 'Lore', targetKind: 'character', targetId: document.characters[0].id, positions: { '16:9': { x: 0, y: 1 }, '9:16': { x: .5, y: .25 } } };
  const draft = makeHotspotDraft(document.shots[0].id, 3, hotspot, hotspot);
  expect(draftValue(draft, document)).toEqual(hotspot);
  draft.hotspot.label = 'Changed';
  expect(draft.before?.label).toBe('Lore');
  for (const invalid of ['', '-1', '101', 'NaN', 'Infinity', '0x10']) expect(draftValue({ ...draft, coordinates: [invalid, '0', '0', '0'] }, document)).toBeNull();
  expect(draftValue({ ...draft, hotspot: { ...draft.hotspot, targetId: 'missing' } }, document)).toBeNull();
  expect(draftValue({ ...draft, hotspot: { ...draft.hotspot, label: '\ufeff\u0085' } }, document)).toBeNull();
});
