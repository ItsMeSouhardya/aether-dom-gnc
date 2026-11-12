import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../cdom.schema.json';
import type { CdomDocument } from './cdom.generated';
import { hasNonScalarText } from './portable';

export type { CdomDocument } from './cdom.generated';
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

export function validateCdom(value: unknown): ValidationResult {
  if (validate(value)) {
    if (hasNonScalarText(value)) return { valid: false, issues: [{ path: '/', message: 'Text must contain Unicode scalar values' }] };
    return { valid: true, document: value };
  }
  return {
    valid: false,
    issues: (validate.errors ?? []).map(error => ({
      path: error.instancePath || '/',
      message: error.message ?? 'Invalid document',
    })),
  };
}
