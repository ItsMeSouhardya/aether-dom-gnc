import { expect, it } from 'vitest';
import fixture from '../fixtures/sample.cdom.json';
import { validateCdom, validateLoreHotspot, resolveHotspot, type CdomDocument } from '../src';

it('validates v6 hotspots and keeps old documents strict', () => {
  const doc = structuredClone(fixture);
  const hotspot = { id: 'hotspot-1', label: 'Lore', targetKind: 'character', targetId: doc.characters[0].id, positions: { '16:9': { x: 0, y: 1 }, '9:16': { x: 1, y: 0 } } };
  doc.schemaVersion = '0.6.0'; Object.assign(doc.shots[0], { hotspots: [hotspot] });
  expect(validateLoreHotspot(hotspot).valid).toBe(true);
  expect(validateCdom(doc).valid).toBe(true);
  doc.schemaVersion = '0.5.0'; expect(validateCdom(doc).valid).toBe(false);
  for (const x of [NaN, Infinity, -0.1, 1.1]) expect(validateLoreHotspot({...hotspot, positions: {...hotspot.positions, '16:9': {x, y: 0}}}).valid).toBe(false);
  for (const label of ['', '\ufeff\u0085']) expect(validateLoreHotspot({...hotspot, label}).valid).toBe(false);
  for (const id of ['constructor', 'id\n', '\ufeffid']) expect(validateLoreHotspot({...hotspot, id}).valid).toBe(false);
});

it('resolves only saved text and reports missing targets without mutating canon', () => {
  const doc = structuredClone(fixture); const before = JSON.stringify(doc);
  const h = { id: 'spot', label: 'Lore', targetKind: 'character' as const, targetId: doc.characters[0].id, positions: { '16:9': {x: 0, y: 1}, '9:16': {x: 1, y: 0} } };
  const detail = resolveHotspot(doc as unknown as CdomDocument, h);
  expect(detail.state).toBe('available'); if (detail.state === 'available') { expect(detail.title).toBe(doc.characters[0].name); expect(JSON.stringify(detail.sections)).toContain(doc.characters[0].dialect.style); expect(detail.evidenceIds).toContain(doc.characters[0].constraints[0].id); }
  expect(resolveHotspot(doc as unknown as CdomDocument, {...h, targetId:'missing'})).toEqual({state:'missing',kind:'character',targetId:'missing'});
  expect(JSON.stringify(doc)).toBe(before);
});


it('includes saved character traits and linked event descriptions as text', () => {
  const doc = structuredClone(fixture); const h = { id:'spot', label:'Lore', targetKind:'character' as const, targetId:doc.characters[0].id, positions:{'16:9':{x:0,y:1},'9:16':{x:1,y:0}} };
  const detail = resolveHotspot(doc as unknown as CdomDocument, h);
  expect(detail.state).toBe('available'); if (detail.state === 'available') { expect(JSON.stringify(detail.sections)).toContain('paranoia'); expect(JSON.stringify(detail.sections)).toContain(doc.events[0].description); }
});

it('enforces the shot budget and global hotspot identity', () => {
  const doc = structuredClone(fixture); doc.schemaVersion='0.6.0';
  const h = { id:'spot',label:'Lore',targetKind:'event',targetId:doc.events[0].id,positions:{'16:9':{x:0,y:1},'9:16':{x:1,y:0}} };
  Object.assign(doc.shots[0],{hotspots:[]}); expect(validateCdom(doc).valid).toBe(true);
  Object.assign(doc.shots[0],{hotspots:Array.from({length:8},(_,i)=>({...h,id:`spot-${i}`}))}); expect(validateCdom(doc).valid).toBe(true);
  Object.assign(doc.shots[0],{hotspots:Array.from({length:9},(_,i)=>({...h,id:`spot-${i}`}))}); expect(validateCdom(doc).valid).toBe(false);
  Object.assign(doc.shots[0],{hotspots:[{...h,id:doc.characters[0].id}]}); expect(validateCdom(doc).valid).toBe(false);
  expect(validateLoreHotspot({...h,targetKind:'unknown'}).valid).toBe(false);
  const event=resolveHotspot(doc as unknown as CdomDocument, h as Parameters<typeof resolveHotspot>[1]); expect(event.state).toBe('available'); if(event.state==='available') expect(JSON.stringify(event.sections)).toContain(doc.events[0].description);
});

it('matches shared hotspot scalar and ID cases', async () => {
  const data = (await import('../fixtures/hotspot-cases.json')).default;
  for (const c of data.cases) expect(validateLoreHotspot({...data.hotspot,[c.field]:c.value}).valid, `${c.field} ${c.value}`).toBe(c.valid);
});
