import { describe, it, expect } from 'vitest';
import { validateRig, evaluateRig, validateRigBindings, applyRigToSvg } from '../src';

const rig = {id:'rig',name:'Rig',bones:[{id:'root',name:'Root',parentId:null,rest:{x:10,y:20,rotationDeg:0},rotationDeg:90,limb:null,action:null},{id:'child',name:'Child',parentId:'root',rest:{x:5,y:0,rotationDeg:0},rotationDeg:0,limb:null,action:null}],attachments:[{id:'slot',name:'Slot',boneId:'child',elementId:'part'}]};
const svg = {assetId:'asset',uri:'assets/a.svg',sourceUri:'assets/a.svg',viewBox:{x:2,y:3,width:100,height:100},root:{tag:'svg' as const,id:'svg',attributes:{},text:'',children:[{tag:'g' as const,id:'part',attributes:{transform:'translate(1 2)'},text:'',children:[]}]}};
describe('rig contract',()=>{
  it('evaluates clockwise parent rotation without mutating source',()=>{
    const original=JSON.stringify(rig); expect(validateRig(rig).valid).toBe(true);
    const result=evaluateRig(rig,0); expect(result.boneMatrices.child[4]).toBeCloseTo(10,9); expect(result.boneMatrices.child[5]).toBeCloseTo(25,9); expect(JSON.stringify(rig)).toBe(original);
  });
  it('rejects cycles, missing references and duplicate ids',()=>{
    for(const edit of [(r:typeof rig)=>{r.bones[0].parentId='child';},(r:typeof rig)=>{r.bones[1].parentId='missing';},(r:typeof rig)=>{r.attachments[0].id='root';}]) { const value=structuredClone(rig); edit(value); expect(validateRig(value).valid).toBe(false); }
  });
  it('validates direct group bindings and preserves artwork',()=>{
    expect(validateRigBindings(rig,svg)).toEqual([]); const before=JSON.stringify(svg); const posed=applyRigToSvg(svg,rig,0); expect(posed.root.children[0].attributes.transform).toContain('translate(1 2)'); expect(JSON.stringify(svg)).toBe(before); expect(validateRigBindings({...rig,attachments:[{...rig.attachments[0],elementId:'missing'}]},svg).length).toBeGreaterThan(0);
  });
});

it('enforces bounded graph and frame budgets',()=>{
  const many=structuredClone(rig); for(let i=2;i<32;i++) many.bones.push({...many.bones[1],id:`bone${i}`}); expect(validateRig(many).valid).toBe(true); many.bones.push({...many.bones[1],id:'bone32'}); expect(validateRig(many).valid).toBe(false);
  const frames=structuredClone(rig) as typeof rig & {bones: Array<typeof rig.bones[number] & {keyframes?:{id:string,timeMs:number,rotationDeg:number}[]}>}; frames.bones[0].keyframes=Array.from({length:128},(_,i)=>({id:`frame${i}`,timeMs:i,rotationDeg:0})); expect(validateRig(frames).valid).toBe(true); frames.bones[1].keyframes=[{id:'extra',timeMs:0,rotationDeg:0}];expect(validateRig(frames).valid).toBe(false);frames.bones[1].keyframes=[];frames.bones[0].keyframes![1].timeMs=0;expect(validateRig(frames).valid).toBe(false);
  for(const n of [Infinity,NaN,10001]) {const invalid=structuredClone(rig);invalid.bones[0].rest.x=n;expect(validateRig(invalid).valid).toBe(false);}
});
it('interpolates through zero, clamps negative time, holds and rejects nonfinite time',()=>{
 const value=structuredClone(rig) as typeof rig & {bones:Array<typeof rig.bones[number] & {keyframes?:{id:string,timeMs:number,rotationDeg:number}[]}>};value.bones[0].rotationDeg=180;value.bones[0].keyframes=[{id:'f',timeMs:100,rotationDeg:-180}];
 expect(evaluateRig(value,50).boneMatrices.root[0]).toBeCloseTo(1,9);expect(evaluateRig(value,-1)).toEqual(evaluateRig(value,0));expect(evaluateRig(value,200)).toEqual(evaluateRig(value,100));expect(()=>evaluateRig(value,NaN)).toThrow();expect(evaluateRig(value,50,false).boneMatrices.root[0]).toBeCloseTo(-1,9);
});
import fixture from '../fixtures/sample.cdom.json';
import shared from '../fixtures/rig-cases.json';
import { validateCdom, validateCommand } from '../src';
it('matches shared matrix expectations and isolates siblings',()=>{
 const value=structuredClone(shared.rig); value.bones.push({...value.bones[1],id:'sibling'}); const first=evaluateRig(value,0); value.bones[1].rotationDeg=42; const second=evaluateRig(value,0);expect(second.boneMatrices.sibling).toEqual(first.boneMatrices.sibling); shared.childMatrix.forEach((n,i)=>expect(first.boneMatrices.child[i]).toBeCloseTo(n,9));
});
it('dispatches v5 and validates ownership, timing, global IDs and old rejection',()=>{
 const doc=structuredClone(fixture);doc.schemaVersion='0.5.0';const layer=doc.layers[0];const ownedRig=structuredClone(rig) as typeof rig & {bones:Array<typeof rig.bones[number] & {keyframes?:{id:string,timeMs:number,rotationDeg:number}[]}>};Object.assign(layer,{kind:'character_sprite',characterId:doc.characters[0].id,rig:ownedRig});expect(validateCdom(doc).valid).toBe(true);doc.schemaVersion='0.4.0';expect(validateCdom(doc).valid).toBe(false);doc.schemaVersion='0.5.0';Object.assign(ownedRig.bones[0],{keyframes:[{id:'frame',timeMs:99999999,rotationDeg:0}]});expect(validateCdom(doc).valid).toBe(false);ownedRig.bones[0].keyframes![0].timeMs=0;ownedRig.id=doc.characters[0].id;expect(validateCdom(doc).valid).toBe(false);
});
it('accepts exact rig commands and rejects invalid imports',()=>{
 const command={commandId:'c',projectId:'p',branchId:'b',expectedRevision:0,actor:{kind:'human',id:'u'},reason:'Edit',targetId:'b',op:'setRigBonePose',args:{rotationDeg:10,action:null}};expect(validateCommand(command).valid).toBe(true);expect(validateCommand({...command,args:{rotationDeg:361,action:null}}).valid).toBe(false);expect(validateCommand({...command,op:'importRigLayer',args:{assetId:'a',layerId:'l',name:'Rig',rights:'project_original',characterId:'ch',svg:'<svg/>',rig:{...rig,bones:[]}}}).valid).toBe(false);
});
it('keeps rest art and paint order, and rejects non-root or transformed slots',()=>{
 const rest=structuredClone(rig);rest.bones[0].rotationDeg=0;const source=structuredClone(svg);source.root.children.push({tag:'g',id:'second',attributes:{transform:'translate(0)'},text:'',children:[]});const before=JSON.stringify(source);const posed=applyRigToSvg(source,rest,0);expect(posed.viewBox).toEqual(source.viewBox);expect(posed.root.children.map(n=>n.id)).toEqual(['part','second']);expect(posed.root.children[0].attributes.transform).toBe('matrix(1 0 0 1 0 0) translate(1 2)');expect(JSON.stringify(source)).toBe(before);const bad=structuredClone(source);bad.root.attributes={transform:'translate(1 2)'};expect(validateRigBindings(rest,bad).length).toBeGreaterThan(0);expect(()=>applyRigToSvg(bad,rest,0)).toThrow();
});
it('uses a time-zero frame over the base angle',()=>{
 const value=structuredClone(rig) as typeof rig & {bones:Array<typeof rig.bones[number] & {keyframes?:{id:string,timeMs:number,rotationDeg:number}[]}>};value.bones[0].keyframes=[{id:'zero',timeMs:0,rotationDeg:0},{id:'later',timeMs:100,rotationDeg:90}];expect(evaluateRig(value,0).boneMatrices.root[0]).toBeCloseTo(1,9);expect(evaluateRig(value,50).boneMatrices.root[0]).toBeCloseTo(Math.SQRT1_2,9);
});

it('executes shared boundary, canonical, matrix and SVG identity cases',()=>{
 for(const c of shared.boundaryCases){const r=structuredClone(shared.rig) as typeof shared.rig & {bones:Array<typeof shared.rig.bones[number] & {keyframes?:{id:string,timeMs:number,rotationDeg:number}[]}>};
  if(c.kind==='bones') while(r.bones.length<c.count!) r.bones.push({...r.bones[1],id:`bone${r.bones.length}`});
  if(c.kind==='frames') {r.bones[0].keyframes=Array.from({length:Math.min(c.count!,128)},(_,i)=>({id:`frame${i}`,timeMs:i,rotationDeg:0}));if(c.count!>128)r.bones[1].keyframes=[{id:'extra',timeMs:0,rotationDeg:0}];}
  if(c.kind==='duplicateId') r.attachments[0].id=r.bones[0].id;
  if(c.kind==='duplicateTime') r.bones[0].keyframes=[{id:'f1',timeMs:1,rotationDeg:0},{id:'f2',timeMs:1,rotationDeg:0}];
  expect(validateRig(r).valid,c.kind+String(c.count)).toBe(c.valid);
 }
 for(const c of shared.documentCases){const doc=structuredClone(fixture);const r=structuredClone(shared.rig) as typeof shared.rig & {bones:Array<typeof shared.rig.bones[number] & {keyframes?:{id:string,timeMs:number,rotationDeg:number}[]}>};doc.schemaVersion=c.kind==='oldVersion'?'0.4.0':'0.5.0';Object.assign(doc.layers[0],{kind:'character_sprite',characterId:doc.characters[0].id,rig:r});if(c.kind==='globalId')r.id=doc.characters[0].id;if(c.kind==='shotLimit'||c.kind==='pastShot')r.bones[0].keyframes=[{id:'frame',timeMs:doc.shots[0].durationMs+(c.kind==='pastShot'?1:0),rotationDeg:0}];expect(validateCdom(doc).valid,c.kind).toBe(c.valid);}
 const timed=structuredClone(shared.rig) as typeof shared.rig & {bones:Array<typeof shared.rig.bones[number] & {keyframes?:{id:string,timeMs:number,rotationDeg:number}[]}>};timed.bones[0].rotationDeg=0;timed.bones[0].keyframes=[{id:'f',timeMs:100,rotationDeg:90}];for(const c of shared.timingCases){const result=evaluateRig(timed,c.timeMs);for(const [actual,expected] of [[result.boneMatrices.child,c.bone],[result.attachmentMatrices.slot,c.attachment]])expected.forEach((n,i)=>expect(Math.abs(actual[i]-n)).toBeLessThan(1e-9));}
 for(const c of shared.bindingCases){const data=structuredClone(shared.svg) as Parameters<typeof validateRigBindings>[1];const node:typeof data.root={tag:'g',id:'part',attributes:{},text:'',children:[]};if(c.kind==='nestedDuplicate') data.root.children[0].children.push(node);if(c.kind==='nonGroupDuplicate') data.root.children.push({...node,tag:'rect'});expect(validateRigBindings(shared.rig,data as Parameters<typeof validateRigBindings>[1]).length===0,c.kind).toBe(c.valid);}
});
