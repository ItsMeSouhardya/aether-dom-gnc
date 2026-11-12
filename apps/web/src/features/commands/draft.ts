import { validateCommand, type CdomCommand, type CdomDocument } from '@aether-dom/schema';

export type Transform = CdomDocument['layers'][number]['transform'];
export const transformKeys = ['x', 'y', 'z', 'scale', 'rotationDeg'] as const;
export type TransformDraft = Record<keyof Transform, string>;
export type CommandOperation = { op: 'setLayerTransform'; targetId: string; args: Partial<Transform> }
  | { op: 'setLayerPose'; targetId: string; args: { pose: string | null } }
  | { op: 'recordConstraintRecovery'; targetId: string; args: { eventId: string; sceneId: string; order: number; description: string } }
  | { op: 'setShotCamera'; targetId: string; args: { camera: CdomDocument['shots'][number]['camera'] } }
  | { op: 'setLayerAppearance'; targetId: string; args: { visible?: boolean; opacity?: number } }
  | { op: 'importSvgLayer'; targetId: string; args: { assetId: string; layerId: string; name: string; rights: 'project_original' | 'licensed' | 'unknown'; svg: string } }
  | { op: 'editSvgElement'; targetId: string; args: { elementId: string; attributes: Record<string, string> } }
  | { op: 'setLayerKeyframe'; targetId: string; args: { keyframeId: string; timeMs: number; transform: Transform } }
  | { op: 'deleteLayerKeyframe'; targetId: string; args: { keyframeId: string } }
  | { op: 'undo' | 'redo' };

export function parseTransformDraft(draft: TransformDraft):
  { valid: true; transform: Transform } | { valid: false; field: keyof Transform; message: string } {
  const transform = {} as Transform;
  for (const key of transformKeys) {
    const text = draft[key].trim();
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text) || !Number.isFinite(Number(text))) {
      return { valid: false, field: key, message: `${key === 'rotationDeg' ? 'Rotation' : key.toUpperCase()} must be a finite number.` };
    }
    transform[key] = Number(text);
  }
  if (transform.scale <= 0) return { valid: false, field: 'scale', message: 'Scale must be greater than zero.' };
  return { valid: true, transform };
}

export function makeCommand(document: CdomDocument, operation: CommandOperation, reason: string, expectedRevision = document.project.revision): CdomCommand {
  const result = validateCommand({ ...operation, commandId: crypto.randomUUID(), projectId: document.project.id, branchId: document.project.activeBranchId,
    expectedRevision, actor: { kind: 'human', id: 'local_creator' }, reason });
  if (!result.valid) throw new Error('The command does not match its contract.');
  return result.command;
}
