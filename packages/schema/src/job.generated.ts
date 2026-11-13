/* Generated from job.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export type ProposalOpName =
  'setLayerTransform' | 'setLayerPose' | 'setLayerAppearance' | 'setShotCamera' | 'setShotTension';

export interface Job {
  jobId: string;
  projectId: string;
  branchId: string;
  baseRevision: number;
  request: {
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
  };
  inputHash: string;
  provider: 'local_mock';
  modelVersion: string;
  estimatedCost: {
    amount: 0;
    currency: 'USD';
  };
  actualCost: {
    amount: 0;
    currency: 'USD';
  } | null;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'stale';
  attempt: number;
  maxAttempts: 3;
  progress: number;
  createdAt: string;
  updatedAt: string;
  leaseExpiresAt: string | null;
  nextAttemptAt: string | null;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  } | null;
  result: {
    kind: 'proposal';
    proposalId: string;
    sha256: string;
  } | null;
}
