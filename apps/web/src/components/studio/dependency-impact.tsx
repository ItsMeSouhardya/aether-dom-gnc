import type { DocumentAnalysis } from '@aether-dom/schema';
import { StudioDrawer } from './studio-drawer';

export function DependencyImpact({ analysis, selectedId, open, toggle }: { analysis: DocumentAnalysis; selectedId: string | null; open: boolean; toggle: () => void }) {
  const { graph, invalidation } = analysis;
  const labels = new Map(graph.nodes.map(node => [node.id, node.label]));
  const dependencies = graph.edges.filter(edge => edge.targetId === selectedId);
  const dependents = graph.edges.filter(edge => edge.sourceId === selectedId);
  return <StudioDrawer id="dependency-content" title="Dependencies" label="Dependency impact" summary={`${graph.nodes.length} nodes · Revision ${analysis.revision}`} open={open} toggle={toggle}>
    <div className="analysis-introduction"><p>{selectedId ? <>Selected <code>{selectedId}</code></> : 'Select a layer to inspect its connections.'}</p><p className="panel-note">Arrows run from a source to the work that depends on it.</p></div>
    {selectedId ? <div className="dependency-columns">{[{ title: 'Depends on', edges: dependencies, source: true }, { title: 'Used by', edges: dependents, source: false }].map(group => <section key={group.title}><h3>{group.title}</h3>{group.edges.length ? <ul>{group.edges.map(edge => { const id = group.source ? edge.sourceId : edge.targetId; return <li key={`${edge.sourceId}-${edge.targetId}-${edge.kind}`}><span>{labels.get(id)}</span><code>{id}</code><small>{edge.kind.replaceAll('_', ' ')}</small></li>; })}</ul> : <p className="panel-note">No direct connections.</p>}</section>)}</div> : null}
    <section className="invalidation-summary"><h3>Latest command impact</h3>{invalidation.changedEntityIds.length ? <><p className="panel-note">Changed: {invalidation.changedEntityIds.join(', ')}. {invalidation.impactedEntityIds.length} dependents affected.</p><p className="panel-note">Evaluation order</p><ol>{invalidation.evaluationOrder.map(id => <li key={id}><code>{id}</code></li>)}</ol></> : <p className="panel-note">Save an edit to see its affected nodes. Reload shows the current graph.</p>}
      {graph.cycleNodeIds.length ? <p className="transform-validation">Dependency cycle: {graph.cycleNodeIds.join(', ')}. Cycles and their blocked dependents cannot be evaluated.</p> : null}
    </section>
  </StudioDrawer>;
}
