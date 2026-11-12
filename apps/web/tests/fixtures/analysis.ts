import type { CdomDocument, DocumentAnalysis } from '@aether-dom/schema';

/** Complete boundary double for tests that isolate non-linter studio behavior. */
export function emptyAnalysis(document: CdomDocument): DocumentAnalysis {
  const entities = [document.project, ...document.branches, ...document.characters, ...document.characters.flatMap(character => character.constraints), ...document.events, ...document.scenes, ...document.shots, ...document.assets, ...document.layers, ...document.audioTracks, ...document.bindings];
  return { revision: document.project.revision, issues: [], graph: { nodes: entities.map(entity => ({ id: entity.id, kind: 'entity', label: entity.id })), edges: [], cycleNodeIds: [] }, invalidation: { changedEntityIds: [], impactedEntityIds: [], evaluationOrder: [], cycleNodeIds: [] } };
}
