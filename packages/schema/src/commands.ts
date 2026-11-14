import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../command.schema.json';
import type { CdomCommand } from './command.generated';
import type { ValidationIssue } from './index';
import { hasNonScalarText } from './portable';
import { validateRig } from './rigs';
import { portableJsonWithin, validateEvidenceArgs } from './asset-rights';

export type { CdomCommand } from './command.generated';
const validate = new Ajv2020({ allErrors: true, strict: true }).compile<CdomCommand>(schema);
export function validateCommand(
  value: unknown,
): { valid: true; command: CdomCommand } | { valid: false; issues: ValidationIssue[] } {
  if (!portableJsonWithin(value, 512 * 1024))
    return { valid: false, issues: [{ path: '/', message: 'Command must be bounded portable JSON' }] };
  if (validate(value)) {
    if (value.op === 'importRigLayer') { const rig = validateRig(value.args.rig); if (!rig.valid) return rig; }
    if (value.op === 'setAssetEvidence' && !validateEvidenceArgs(value.args))
      return { valid: false, issues: [{ path: '/args', message: 'Invalid or oversized evidence' }] };
    if (hasNonScalarText(value))
      return { valid: false, issues: [{ path: '/', message: 'Text must contain Unicode scalar values' }] };
    return { valid: true, command: value };
  }
  return {
    valid: false,
    issues: (validate.errors ?? []).map((error) => ({
      path: error.instancePath || '/',
      message: error.message ?? 'Invalid command',
    })),
  };
}
