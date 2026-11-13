/* Generated from fork-result.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export type RouteId = string;
export type Revision = number;

export interface ForkResult {
  branch: BranchSummary;
  receipt: ForkReceipt;
}
export interface BranchSummary {
  id: RouteId;
  name: string;
  parentId: RouteId | null;
  baseRevision: Revision;
  headRevision: Revision;
}
export interface ForkReceipt {
  commandId: string;
  sourceBranchId: RouteId;
  sourceRevision: Revision;
  branchId: RouteId;
  actor: {
    kind: 'human';
    id: string;
  };
  reason: string;
  createdAt: string;
}
