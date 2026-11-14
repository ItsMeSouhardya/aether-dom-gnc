import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../rig.schema.json';
import type { Rig } from './rig.generated';
import { validateSvgAsset, type SvgData } from './svg';
import type { ValidationIssue } from './index';
import { hasNonScalarText, portableJsonWithin } from './portable';
export type { Rig } from './rig.generated';
export type RigBone = Rig['bones'][number];
export type RigAttachment = Rig['attachments'][number];
export type RigBoneKeyframe = NonNullable<RigBone['keyframes']>[number];
export type Matrix2D = [number,number,number,number,number,number];
export type RigEvaluation = {boneMatrices:Record<string,Matrix2D>; attachmentMatrices:Record<string,Matrix2D>};
const check = new Ajv2020({allErrors:true,strict:true}).compile<Rig>(schema);
const issue = (message:string):ValidationIssue[] => [{path:'/',message}];
export function validateRig(value:unknown):{valid:true;rig:Rig}|{valid:false;issues:ValidationIssue[]} {
  if (!portableJsonWithin(value, 128 * 1024) || !check(value) || hasNonScalarText(value)) return {valid:false,issues:issue('Invalid rig structure')};
  const ids=new Set<string>(); let frames=0, roots=0;
  for (const entity of [value,...value.bones,...value.attachments,...value.bones.flatMap(b=>b.keyframes??[])]) {
    if(ids.has(entity.id)) return {valid:false,issues:issue('Duplicate rig entity ID')}; ids.add(entity.id);
  }
  const bones=new Map(value.bones.map(b=>[b.id,b]));
  for (const bone of value.bones) {
    if (!bone.parentId) roots++;
    const seen=new Set<string>(); let cursor:RigBone|undefined=bone;
    while(cursor) { if(seen.has(cursor.id)) return {valid:false,issues:issue('Cyclic bone graph')}; seen.add(cursor.id); if(cursor.parentId && !bones.has(cursor.parentId)) return {valid:false,issues:issue('Missing bone parent')}; cursor=cursor.parentId ? bones.get(cursor.parentId):undefined; }
    const times=new Set<number>(); for(const frame of bone.keyframes??[]) {frames++; if(times.has(frame.timeMs)) return {valid:false,issues:issue('Duplicate bone frame time')}; times.add(frame.timeMs);}
  }
  if(roots!==1 || frames>128) return {valid:false,issues:issue('Invalid root or frame count')};
  const slots=new Set<string>(); for(const attachment of value.attachments){if(!bones.has(attachment.boneId)||slots.has(attachment.elementId)) return {valid:false,issues:issue('Invalid attachment')};slots.add(attachment.elementId);}
  return {valid:true,rig:value};
}
export function validateRigBindings(rig:Rig,svg:SvgData):ValidationIssue[] {
  if (!validateRig(rig).valid || !svg?.root || !validateSvgAsset({assetId:'rig-validation',uri:'assets/rig.svg',sourceUri:'assets/rig.svg',...svg}).valid || svg.root.tag!=='svg' || Object.hasOwn(svg.root.attributes,'transform')) return issue('Invalid rig or SVG root');
  for(const slot of rig.attachments) if(svg.root.children.filter(n=>n.id===slot.elementId && n.tag==='g').length!==1) return issue('Attachment must reference a direct root group');
  return [];
}
const mul=(a:Matrix2D,b:Matrix2D):Matrix2D=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const local=(x:number,y:number,deg:number):Matrix2D=>{const rad=deg*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad);return [c,s,-s,c,x,y];};
const inv=(m:Matrix2D):Matrix2D=>[m[0],m[2],m[1],m[3],-m[0]*m[4]-m[1]*m[5],-m[2]*m[4]-m[3]*m[5]];
function angle(b:RigBone,time:number,animate:boolean):number {if(!animate) return b.rotationDeg; const frames=[...(b.keyframes??[])].sort((a,b)=>a.timeMs-b.timeMs); let previous={timeMs:0,rotationDeg:b.rotationDeg}; for(const f of frames){if(f.timeMs===0){previous=f;continue;} if(time<f.timeMs) return previous.rotationDeg+(f.rotationDeg-previous.rotationDeg)*(time-previous.timeMs)/(f.timeMs-previous.timeMs);previous=f;}return previous.rotationDeg;}
export function evaluateRig(rig:Rig,timeMs:number,animate=true):RigEvaluation {
  if(!validateRig(rig).valid || !Number.isFinite(timeMs)) throw new Error('Invalid rig or time');
  const time=Math.max(0,timeMs), posed:Record<string,Matrix2D>=Object.create(null),rest:Record<string,Matrix2D>=Object.create(null); const remaining=[...rig.bones];
  while(remaining.length){const index=remaining.findIndex(b=>!b.parentId || Object.hasOwn(posed,b.parentId));const b=remaining.splice(index,1)[0];const base=local(b.rest.x,b.rest.y,b.rest.rotationDeg), pose=local(b.rest.x,b.rest.y,b.rest.rotationDeg+angle(b,time,animate)); rest[b.id]=b.parentId?mul(rest[b.parentId],base):base;posed[b.id]=b.parentId?mul(posed[b.parentId],pose):pose;}
  const attachments:Record<string,Matrix2D>=Object.create(null);for(const a of rig.attachments) attachments[a.id]=mul(posed[a.boneId],inv(rest[a.boneId])); return {boneMatrices:posed,attachmentMatrices:attachments};
}
