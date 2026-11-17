import { validateLoreHotspot, type CdomDocument, type LoreHotspot } from '@aether-dom/schema';

export type HotspotDraft = { shotId: string; revision: number; before: LoreHotspot | null; hotspot: LoreHotspot; coordinates: [string, string, string, string]; deleting: boolean; review: boolean };
export function draftValue(draft: HotspotDraft, document: CdomDocument): LoreHotspot | null {
  const numbers = draft.coordinates.map(value => /^\s*(?:\d+(?:\.\d*)?|\.\d+)\s*$/.test(value) ? Number(value) : NaN);
  if (numbers.some(value => !Number.isFinite(value) || value < 0 || value > 100)) return null;
  const hotspot = { ...draft.hotspot, positions: { '16:9': { x: numbers[0] / 100, y: numbers[1] / 100 }, '9:16': { x: numbers[2] / 100, y: numbers[3] / 100 } } };
  const target = hotspot.targetKind === 'character' ? document.characters : document.events;
  return validateLoreHotspot(hotspot).valid && target.some(item => item.id === hotspot.targetId) ? hotspot : null;
}
export function makeHotspotDraft(shotId: string, revision: number, hotspot: LoreHotspot, before: LoreHotspot | null, deleting = false): HotspotDraft {
  return { shotId, revision, before: before && structuredClone(before), hotspot: structuredClone(hotspot), coordinates: [hotspot.positions['16:9'].x, hotspot.positions['16:9'].y, hotspot.positions['9:16'].x, hotspot.positions['9:16'].y].map(value => String(value * 100)) as HotspotDraft['coordinates'], deleting, review: false };
}
