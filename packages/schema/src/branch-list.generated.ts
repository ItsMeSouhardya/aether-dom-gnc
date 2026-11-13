/* Generated from branch-list.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export type RouteId = string;
export type Revision = number;

export interface BranchList {
  projectId: RouteId;
  /**
   * @maxItems 64
   */
  branches: BranchSummary[];
}
export interface BranchSummary {
  id: RouteId;
  name: string;
  parentId: RouteId | null;
  baseRevision: Revision;
  headRevision: Revision;
}
