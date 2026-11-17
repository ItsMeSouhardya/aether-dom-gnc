import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../hotspot.schema.json';
import { portableJsonWithin } from './portable';
import type { LoreHotspot } from './hotspot.generated';
import type { CdomDocument, ValidationIssue } from './index';

const validate = new Ajv2020({ allErrors: true, strict: true }).compile<LoreHotspot>(schema);
export function validateLoreHotspot(value: unknown): { valid: true; hotspot: LoreHotspot } | { valid: false; issues: ValidationIssue[] } {
  if (!portableJsonWithin(value, 4096) || !validate(value)) return { valid: false, issues: (validate.errors ?? []).map(e => ({path: e.instancePath || '/', message: e.message ?? 'Invalid hotspot'})).concat([{path: '/', message: 'Invalid hotspot'}]) };
  return { valid: true, hotspot: value };
}
export function validateDocumentHotspots(document: CdomDocument): ValidationIssue[] {
  const ids = new Map<string, number>();
  const visit = (value: unknown): void => { if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') { const obj = value as Record<string, unknown>; if (typeof obj.id === 'string') ids.set(obj.id, (ids.get(obj.id) ?? 0) + 1); Object.values(obj).forEach(visit); } };
  visit(document);
  return document.shots.flatMap(shot => (shot.hotspots ?? []).filter(h => ids.get(h.id) !== 1).map(() => ({path: '/shots', message: 'Hotspot ID must be globally unique'})));
}

export type HotspotSection = { heading: string; rows: { label: string; text: string }[] };
export type HotspotDetail = { state: 'missing'; kind: LoreHotspot['targetKind']; targetId: string } | { state: 'available'; kind: LoreHotspot['targetKind']; title: string; sections: HotspotSection[]; evidenceIds: string[] };
export function resolveHotspot(document: CdomDocument, hotspot: LoreHotspot): HotspotDetail {
  if (hotspot.targetKind === 'event') {
    const event = document.events.find(item => item.id === hotspot.targetId);
    if (!event) return { state: 'missing', kind: hotspot.targetKind, targetId: hotspot.targetId };
    return { state: 'available', kind: 'event', title: event.kind, sections: [{heading:'Event', rows:[{label:'Kind',text:event.kind},{label:'Order',text:String(event.order)},{label:'Description',text:event.description}]}], evidenceIds: [event.id, event.sceneId] };
  }
  const character = document.characters.find(item => item.id === hotspot.targetId);
  if (!character) return { state: 'missing', kind: hotspot.targetKind, targetId: hotspot.targetId };
  const evidenceIds = [character.id, ...character.constraints.flatMap(c => [c.id, c.effectiveFromEventId, ...(c.resolvedByEventId ? [c.resolvedByEventId] : [])])];
  const linked = document.events.filter(event => evidenceIds.includes(event.id));
  return { state:'available', kind:'character', title:character.name, sections:[{heading:'Character',rows:[{label:'Dialect',text:character.dialect.style},{label:'Forbidden terms',text:character.dialect.forbiddenTerms.join(', ')}]}, {heading:'Traits',rows:Object.entries(character.traits).map(([label, value]) => ({label,text:String(value)}))}, {heading:'Constraints',rows:character.constraints.map(c => ({label:c.type,text:`${c.limb}: ${c.effectiveFromEventId}${c.resolvedByEventId ? ` → ${c.resolvedByEventId}` : ''}`}))}, {heading:'Linked events',rows:linked.map(e => ({label:`${e.kind} (${e.order})`,text:e.description}))}], evidenceIds };
}
