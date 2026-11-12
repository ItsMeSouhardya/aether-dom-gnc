import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../command.schema.json';
import type { CdomCommand } from './command.generated';
import type { ValidationIssue } from './index';
import { hasNonScalarText } from './portable';

export type { CdomCommand } from './command.generated';
const validate = new Ajv2020({ allErrors: true, strict: true }).compile<CdomCommand>(schema);
export function validateCommand(value: unknown):
  { valid: true; command: CdomCommand } | { valid: false; issues: ValidationIssue[] } {
  if (validate(value)) {
    if (hasNonScalarText(value)) return { valid: false, issues: [{ path: '/', message: 'Text must contain Unicode scalar values' }] };
    return { valid: true, command: value };
  }
  return { valid: false, issues: (validate.errors ?? []).map(error => ({ path: error.instancePath || '/', message: error.message ?? 'Invalid command' })) };
}
