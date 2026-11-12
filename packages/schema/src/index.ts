import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../cdom.schema.json';
import schemaV2 from '../cdom.v0.2.schema.json';
import type { CdomDocumentV2 } from './cdom-v2.generated';
import { hasNonScalarText } from './portable';

export type { CdomDocument as CdomDocumentV1 } from './cdom.generated';
export type { CdomDocumentV2 } from './cdom-v2.generated';
export type CdomDocument = Omit<CdomDocumentV2, 'schemaVersion'> & { schemaVersion: '0.1.0' | '0.2.0' };
export { validateSvgAsset } from './svg';
export type { SvgAsset, SvgData, SvgNode } from './svg';
export { validateCommand } from './commands';
export type { CdomCommand } from './command.generated';
export { validateAnalysis } from './analysis';
export type { DocumentAnalysis } from './analysis.generated';
export type ValidationIssue = { path: string; message: string };
export type ValidationResult =
  | { valid: true; document: CdomDocument }
  | { valid: false; issues: ValidationIssue[] };

// No coercion, default injection or property removal at the canonical boundary.
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validate = ajv.compile<CdomDocument>(schema);
const validateV2 = ajv.compile<CdomDocument>(schemaV2);

export function validateCdom(value: unknown): ValidationResult {
  const selected = typeof value === 'object' && value !== null && 'schemaVersion' in value && value.schemaVersion === '0.2.0' ? validateV2 : validate;
  if (selected(value)) {
    if (hasNonScalarText(value)) return { valid: false, issues: [{ path: '/', message: 'Text must contain Unicode scalar values' }] };
    return { valid: true, document: value };
  }
  return {
    valid: false,
    issues: (selected.errors ?? []).map(error => ({
      path: error.instancePath || '/',
      message: error.message ?? 'Invalid document',
    })),
  };
}
