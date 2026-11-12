import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../analysis.schema.json';
import type { DocumentAnalysis } from './analysis.generated';
import type { ValidationIssue } from './index';

const validate = new Ajv2020({ allErrors: true, strict: true }).compile<DocumentAnalysis>(schema);
export function validateAnalysis(value: unknown):
  { valid: true; analysis: DocumentAnalysis } | { valid: false; issues: ValidationIssue[] } {
  if (!validate(value)) return { valid: false, issues: (validate.errors ?? []).map(error => ({ path: error.instancePath || '/', message: error.message ?? 'Invalid analysis' })) };
  const ids = new Set(value.graph.nodes.map(node => node.id));
  const known = (values: string[]) => values.every(id => ids.has(id));
  if (ids.size !== value.graph.nodes.length || new Set(value.issues.map(issue => issue.id)).size !== value.issues.length
    || value.graph.edges.some(edge => !ids.has(edge.sourceId) || !ids.has(edge.targetId))
    || !known(value.graph.cycleNodeIds) || !known(value.invalidation.impactedEntityIds)
    || !known(value.invalidation.evaluationOrder) || !known(value.invalidation.cycleNodeIds)) {
    return { valid: false, issues: [{ path: '/graph', message: 'Analysis contains ambiguous or missing graph nodes' }] };
  }
  return { valid: true, analysis: value };
}
