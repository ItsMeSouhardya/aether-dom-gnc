/* Generated from proposal.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export type ProposalOpName =
  'setLayerTransform' | 'setLayerPose' | 'setLayerAppearance' | 'setShotCamera' | 'setShotTension';
export type ProposalOperation =
  | {
      op: 'setLayerTransform';
      targetId: string;
      args: Transform;
    }
  | {
      op: 'setLayerPose';
      targetId: string;
      args: {
        pose: string | null;
      };
    }
  | {
      op: 'setLayerAppearance';
      targetId: string;
      args: {
        visible?: boolean;
        opacity?: number;
      };
    }
  | {
      op: 'setShotCamera';
      targetId: string;
      args: {
        camera: {
          aspectRatio: '16:9' | '9:16' | '1:1';
          position: {
            x: number;
            y: number;
            z: number;
          };
          fovDeg: number;
        };
      };
    }
  | {
      op: 'setShotTension';
      targetId: string;
      args: {
        tension: number;
      };
    };
export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | {
      [k: string]: Json;
    };

export interface Proposal {
  proposalId: string;
  projectId: string;
  branchId: string;
  baseRevision: number;
  agentRole: 'lore' | 'visual' | 'acoustic';
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
  /**
   * @minItems 1
   * @maxItems 8
   */
  operations: ProposalOperation[];
  /**
   * @minItems 0
   * @maxItems 32
   */
  evidenceNodeIds: string[];
  explanation: string;
  /**
   * @minItems 1
   * @maxItems 32
   */
  contextNodes: {
    id: string;
    kind: 'layer' | 'shot' | 'character' | 'constraint' | 'event';
    value: Json;
  }[];
  contextDigest: string;
  /**
   * @minItems 1
   * @maxItems 128
   */
  diff: {
    entityId: string;
    path: string;
    before: Json;
    after: Json;
    beforePresent: boolean;
    afterPresent: boolean;
  }[];
  schemaVersionBefore: '0.1.0' | '0.2.0' | '0.3.0' | '0.4.0' | '0.5.0' | '0.6.0';
  schemaVersionAfter: '0.1.0' | '0.2.0' | '0.3.0' | '0.4.0' | '0.5.0' | '0.6.0';
  provider: 'local_mock';
  modelVersion: string;
  estimatedCost: {
    amount: number;
    currency: 'USD';
  };
  previewRef: null;
  status: 'pending_review' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  approvalCommandId: string | null;
}
export interface Transform {
  x?: number;
  y?: number;
  z?: number;
  scale?: number;
  rotationDeg?: number;
}
