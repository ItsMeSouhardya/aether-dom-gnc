import type { SvgAsset } from './svg';
import { validateSvgAsset } from './svg';
import { evaluateRig, validateRigBindings, type Rig } from './rigs';
export function applyRigToSvg(asset:SvgAsset,rig:Rig,timeMs:number,animate=true):SvgAsset {
  if(!validateSvgAsset(asset).valid || validateRigBindings(rig,asset).length) throw new Error('Invalid rig SVG binding');
  const matrices=evaluateRig(rig,timeMs,animate).attachmentMatrices; const result=structuredClone(asset);
  for(const slot of rig.attachments){const group=result.root.children.find(n=>n.id===slot.elementId)!;const matrix=matrices[slot.id];group.attributes.transform=`matrix(${matrix.join(' ')})${group.attributes.transform ? ` ${group.attributes.transform}`:''}`;}
  return result;
}
