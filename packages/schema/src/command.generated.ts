/* Generated from command.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export type CdomCommand =
  | (Envelope & {
      op: 'setLayerPose';
      targetId: string;
      args: {
        pose: string | null;
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'recordConstraintRecovery';
      targetId: string;
      args: {
        eventId: string;
        sceneId: string;
        order: number;
        description: string;
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'setLayerTransform';
      targetId: string;
      args: Transform;
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'undo' | 'redo';
      [k: string]: unknown;
    });

export interface Envelope {
  commandId: string;
  projectId: string;
  branchId: string;
  expectedRevision: number;
  actor: {
    kind: 'human';
    id: string;
  };
  reason: string;
  [k: string]: unknown;
}
export interface Transform {
  x?: number;
  y?: number;
  z?: number;
  scale?: number;
  rotationDeg?: number;
}
