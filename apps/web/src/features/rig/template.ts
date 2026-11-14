import { validateRig, type CdomCommand, type Rig } from '@aether-dom/schema';

export type RigTemplate = { templateVersion: '1.0.0'; name: string; svg: string; rig: Rig };
export function parseRigTemplate(value: unknown): RigTemplate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid rig template.');
  const item = value as Record<string, unknown>;
  if (item.templateVersion !== '1.0.0' || typeof item.name !== 'string' || !item.name.trim() || Array.from(item.name).length > 80 || typeof item.svg !== 'string' || !item.svg.trim() || new TextEncoder().encode(item.svg).length > 256 * 1024 || !validateRig(item.rig).valid) throw new Error('Invalid rig template.');
  return item as RigTemplate;
}
export function instantiateRig(template: RigTemplate, prefix: string) {
  const rig = structuredClone(template.rig);
  const ids = new Map(rig.bones.map((bone, index) => [bone.id, `${prefix}_bone_${index}`]));
  rig.id = `${prefix}_rig`;
  rig.bones = rig.bones.map((bone, index) => ({ ...bone, id: ids.get(bone.id)!, parentId: bone.parentId === null ? null : ids.get(bone.parentId)!, ...(bone.keyframes ? { keyframes: bone.keyframes.map((frame, i) => ({ ...frame, id: `${prefix}_frame_${index}_${i}` })) } : {}) }));
  rig.attachments = rig.attachments.map((slot, index) => ({ ...slot, id: `${prefix}_slot_${index}`, boneId: ids.get(slot.boneId)! }));
  return { name: template.name, svg: template.svg, rig: rig as Extract<CdomCommand, { op: 'importRigLayer' }>['args']['rig'], assetId: `${prefix}_asset`, layerId: `${prefix}_layer` };
}
