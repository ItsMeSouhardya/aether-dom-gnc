import { expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import documentSchema from '../cdom.v0.5.schema.json';
import commandSchema from '../command.schema.json';
import cases from '../fixtures/rig-unicode-cases.json';
import shared from '../fixtures/rig-cases.json';
import fixture from '../fixtures/sample.cdom.json';
import { validateCdom, validateCommand, validateRig } from '../src';

// Check the embedded schemas too: public semantic rig validation must not mask
// a stale copy in the document or command wire contract.
const rawDocument = new Ajv2020({strict:true}).compile(documentSchema);
const rawCommand = new Ajv2020({strict:true}).compile(commandSchema);
const envelope = {commandId:'unicode',projectId:'p',branchId:'b',expectedRevision:0,actor:{kind:'human',id:'u'},reason:'Edit',targetId:'root'};
const textPaths = [['name'],['bones',0,'name'],['bones',0,'limb'],['bones',0,'action'],['attachments',0,'name']];
const idPaths = [['id'],['bones',0,'id'],['bones',1,'parentId'],['bones',0,'keyframes',0,'id'],['attachments',0,'id'],['attachments',0,'boneId'],['attachments',0,'elementId']];

function changedRig(path:(string|number)[], value:string) {
  const rig = {...structuredClone(shared.rig), bones: shared.rig.bones.map(b=>({...structuredClone(b),keyframes:[]}))};
  Object.assign(rig.bones[0], {keyframes:[{id:'frame',timeMs:0,rotationDeg:0}]});
  // Replacing an ID also replaces references, so valid cases test the pattern,
  // rather than failing for an unrelated missing parent/bone.
  const root = rig as unknown as Record<string, unknown>;
  let owner = root;
  for (const key of path.slice(0,-1)) owner = owner[key] as Record<string, unknown>;
  const old = owner[path.at(-1)!];
  owner[path.at(-1)!] = value;
  if (path.at(-1) !== 'name' && path.at(-1) !== 'limb' && path.at(-1) !== 'action') {
    for (const bone of rig.bones) {
      if (bone.id === old) bone.id = value;
      if (bone.parentId === old) bone.parentId = value;
    }
    for (const slot of rig.attachments) if (slot.boneId === old) slot.boneId = value;
  }
  return rig;
}

it.each(cases)('shares rig/document/import Unicode guards: $name', c=>{
  for (const [paths,valid] of [[textPaths,c.validText],[idPaths,c.validId]] as const) for (const path of paths) {
    const rig = changedRig(path,c.value);
    expect(validateRig(rig).valid,JSON.stringify(path)).toBe(valid);
    const doc = structuredClone(fixture);
    doc.schemaVersion = '0.5.0';
    Object.assign(doc.layers[0],{kind:'character_sprite',characterId:doc.characters[0].id,rig});
    expect(validateCdom(doc).valid,JSON.stringify(path)).toBe(valid);
    expect(rawDocument(doc),JSON.stringify(path)).toBe(valid);
    const command = {...envelope,op:'importRigLayer',args:{assetId:'asset',layerId:'layer',name:'Rig',rights:'project_original',characterId:'character',svg:'<svg/>',rig}};
    expect(validateCommand(command).valid,JSON.stringify(path)).toBe(valid);
    expect(rawCommand(command),JSON.stringify(path)).toBe(valid);
  }
});

it.each(cases)('shares new command Unicode text/ID guards: $name', c=>{
  expect(validateCommand({...envelope,op:'setRigBonePose',args:{rotationDeg:0,action:c.value}}).valid).toBe(c.validText);
  for (const op of ['setRigBoneKeyframe','deleteRigBoneKeyframe']) {
    expect(validateCommand({...envelope,op,args:{keyframeId:c.value,...(op==='setRigBoneKeyframe'?{timeMs:0,rotationDeg:0}:{})}}).valid).toBe(c.validId);
  }
  const args = {assetId:'asset',layerId:'layer',name:'Rig',rights:'project_original',characterId:'character',svg:'<svg/>',rig:shared.rig};
  expect(validateCommand({...envelope,op:'importRigLayer',args:{...args,name:c.value}}).valid).toBe(c.validText);
  expect(validateCommand({...envelope,op:'importRigLayer',args:{...args,characterId:c.value}}).valid).toBe(c.validId);
});
