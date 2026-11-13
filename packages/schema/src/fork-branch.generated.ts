/* Generated from fork-branch.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export type RouteId = string;

export interface ForkBranchCommand {
  commandId: string;
  op: 'forkBranch';
  projectId: RouteId;
  sourceBranchId: RouteId;
  expectedRevision: number;
  newBranchId: RouteId;
  name: string;
  actor: Actor;
  reason: string;
}
export interface Actor {
  kind: 'human';
  id: string;
}
