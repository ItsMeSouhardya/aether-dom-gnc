/* Generated from job-request.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export type ProposalOpName =
  'setLayerTransform' | 'setLayerPose' | 'setLayerAppearance' | 'setShotCamera' | 'setShotTension';

export interface JobRequest {
  requestId: string;
  expectedRevision: number;
  /**
   * @minItems 1
   * @maxItems 8
   */
  scopeIds: string[];
  /**
   * @minItems 1
   * @maxItems 5
   */
  allowedOps: ProposalOpName[];
  intent: 'repair_pose' | 'move_right' | 'set_tension';
  message: string;
}
