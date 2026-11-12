/* Generated from analysis.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export type Id = string;
export type Ids = Id[];

export interface DocumentAnalysis {
  revision: number;
  issues: Diagnostic[];
  graph: {
    nodes: {
      id: Id;
      kind: Id;
      label: string;
    }[];
    edges: {
      sourceId: Id;
      targetId: Id;
      kind: Id;
    }[];
    cycleNodeIds: Ids;
  };
  invalidation: {
    changedEntityIds: Ids;
    impactedEntityIds: Ids;
    evaluationOrder: Ids;
    cycleNodeIds: Ids;
  };
}
export interface Diagnostic {
  id: Id;
  code: Id;
  severity: 'warning' | 'error';
  subjectId: Id;
  path: string;
  message: string;
  evidence: Evidence[];
}
export interface Evidence {
  entityId: Id;
  path: string;
  message: string;
}
