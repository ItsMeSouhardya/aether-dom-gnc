/* Generated from branch-diff.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export type RouteId = string;
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | {
      [k: string]: JsonValue;
    };

export interface ThreeWayDiff {
  projectId: RouteId;
  base: BranchRevision;
  left: BranchRevision;
  right: BranchRevision;
  /**
   * @maxItems 4096
   */
  changes: BranchChange[];
  conflictCount: number;
}
export interface BranchRevision {
  branchId: RouteId;
  revision: number;
}
export interface BranchChange {
  collection:
    | 'document'
    | 'project'
    | 'provenance'
    | 'characters'
    | 'events'
    | 'scenes'
    | 'shots'
    | 'assets'
    | 'layers'
    | 'audioTracks'
    | 'bindings';
  entityId: string;
  path: string;
  basePresent: boolean;
  leftPresent: boolean;
  rightPresent: boolean;
  base: JsonValue;
  left: JsonValue;
  right: JsonValue;
  status: 'left_only' | 'right_only' | 'same_change' | 'conflict';
}
