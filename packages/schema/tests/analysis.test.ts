import { expect, it } from 'vitest';
import * as contract from '../src/index';

const analysis = { revision: 0, issues: [{ id: 'issue_one', code: 'CANON_PHYSICAL_CONFLICT', severity: 'warning', subjectId: 'layer_kael', path: '/layers/1/pose', message: 'Left arm remains injured', evidence: [{ entityId: 'event_injury', path: '/events/0', message: 'Injury event' }] }], graph: { nodes: [{ id: 'layer_kael', kind: 'layer', label: 'Kael' }], edges: [], cycleNodeIds: [] }, invalidation: { changedEntityIds: [], impactedEntityIds: [], evaluationOrder: [], cycleNodeIds: [] } };
it('validates revision-bound diagnostics without changing their evidence', () => {
  const before = JSON.stringify(analysis);
  expect(contract.validateAnalysis(analysis)).toMatchObject({ valid: true, analysis });
  expect(JSON.stringify(analysis)).toBe(before);
});
it.each([
  { revision: -1 }, { revision: Infinity }, { issues: [{ ...analysis.issues[0], evidence: 'event_injury' }] },
  { issues: [{ ...analysis.issues[0], severity: 'success' }] }, { graph: { ...analysis.graph, edges: [{ sourceId: 'missing', targetId: 'layer_kael', kind: 'depends_on' }] } },
  { graph: { ...analysis.graph, nodes: [...analysis.graph.nodes, analysis.graph.nodes[0]] } },
  { invalidation: { ...analysis.invalidation, evaluationOrder: ['missing'] } },
])('rejects invalid analysis %# before the studio can display it', invalid => {
  expect(contract.validateAnalysis({ ...analysis, ...invalid }).valid).toBe(false);
});
