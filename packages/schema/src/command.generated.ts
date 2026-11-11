/* Generated from command.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export type CdomCommand =
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
