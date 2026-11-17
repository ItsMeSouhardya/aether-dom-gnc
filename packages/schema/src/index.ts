import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../cdom.schema.json';
import schemaV2 from '../cdom.v0.2.schema.json';
import schemaV3 from '../cdom.v0.3.schema.json';
import schemaV4 from '../cdom.v0.4.schema.json';
import schemaV5 from '../cdom.v0.5.schema.json';
import schemaV6 from '../cdom.v0.6.schema.json';
import { validateDocumentHotspots } from './hotspots';
import { validateDocumentRigs } from './rig-document';
import { validateAssetProvenance } from './asset-rights';
import type { CdomDocumentV6 } from './cdom-v6.generated';
import type { CdomDocumentV5 } from './cdom-v5.generated';
import { hasNonScalarText } from './portable';

export type { CdomDocument as CdomDocumentV1 } from './cdom.generated';
export type { CdomDocumentV2 } from './cdom-v2.generated';
export type { CdomDocumentV3 } from './cdom-v3.generated';
export type { CdomDocumentV4 } from './cdom-v4.generated';
export type { CdomDocumentV5 } from './cdom-v5.generated';
export type { CdomDocumentV6 } from './cdom-v6.generated';
export type { LoreHotspot } from './hotspot.generated';
export { validateLoreHotspot, resolveHotspot } from './hotspots';
export type { HotspotDetail, HotspotSection } from './hotspots';
export type CdomDocument = Omit<CdomDocumentV6, 'schemaVersion'> & {
  schemaVersion: '0.1.0' | '0.2.0' | '0.3.0' | '0.4.0' | '0.5.0' | '0.6.0';
};
export { evaluateAssetUse, validateAssetProvenance } from './asset-rights';
export type {
  AssetProvenance,
  ExportUse,
  Permission,
  Consent,
  EvidenceBlob,
  AssetUseDecision,
} from './asset-rights';
export { sha256Bytes, svgPayloadHash } from './asset-hash';
export { validateSvgAsset } from './svg';
export type { SvgAsset, SvgData, SvgNode } from './svg';
export { validateCommand } from './commands';
export type { CdomCommand, AssetEvidenceArgs } from './command.generated';
export { validateAnalysis } from './analysis';
export type { DocumentAnalysis } from './analysis.generated';
export { validateProposal, validateProposalRequest } from './proposals';
export type { Proposal, ProposalRequest, ProposalOperation, ProposalOpName } from './proposals';
export { validatePlayerManifest, decodeManifestAudio, parsePlayerManifest } from './player-manifest';
export type { PlayerManifest, PlayerAsset } from './player-manifest';
export {
  validateForkBranchCommand,
  validateBranchList,
  validateBranchDiff,
  validateForkResult,
  validateForkBranchResult,
} from './branches';
export type {
  ForkBranchCommand,
  BranchList,
  BranchSummary,
  BranchChange,
  ThreeWayDiff,
  ForkResult,
  ForkBranchResult,
} from './branches';
export type ValidationIssue = { path: string; message: string };
export { validateJob, validateJobRequest } from './jobs';
export type { Job, JobRequest } from './jobs';
export type ValidationResult =
  { valid: true; document: CdomDocument } | { valid: false; issues: ValidationIssue[] };

// No coercion, default injection or property removal at the canonical boundary.
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validate = ajv.compile<CdomDocument>(schema);
const validateV2 = ajv.compile<CdomDocument>(schemaV2);
const validateV3 = ajv.compile<CdomDocument>(schemaV3);

const validateV4 = ajv.compile<CdomDocument>(schemaV4);
const validateV5 = ajv.compile<CdomDocument>(schemaV5);
const validateV6 = ajv.compile<CdomDocument>(schemaV6);

export function validateCdom(value: unknown): ValidationResult {
  const version =
    typeof value === 'object' && value !== null && 'schemaVersion' in value ? value.schemaVersion : null;
  const selected =
    version === '0.6.0'
      ? validateV6
      : version === '0.5.0'
      ? validateV5
      : version === '0.4.0'
      ? validateV4
      : version === '0.3.0'
        ? validateV3
        : version === '0.2.0'
          ? validateV2
          : validate;
  if (
    (version === '0.4.0' || version === '0.5.0' || version === '0.6.0') &&
    typeof value === 'object' &&
    value !== null &&
    'assets' in value &&
    Array.isArray(value.assets)
  ) {
    for (const asset of value.assets) {
      if (typeof asset === 'object' && asset !== null && Object.hasOwn(asset, 'provenance')) {
        const check = validateAssetProvenance(asset.provenance);
        if (!check.valid) return check;
      }
    }
  }
  if (selected(value)) {
    if (version === '0.5.0' || version === '0.6.0') { const issues = validateDocumentRigs(value as CdomDocumentV5); if (issues.length) return { valid:false, issues }; }
    if (version === '0.6.0') { const issues = validateDocumentHotspots(value); if (issues.length) return { valid: false, issues }; }
    if (hasNonScalarText(value))
      return { valid: false, issues: [{ path: '/', message: 'Text must contain Unicode scalar values' }] };
    return { valid: true, document: value };
  }
  return {
    valid: false,
    issues: (selected.errors ?? []).map((error) => ({
      path: error.instancePath || '/',
      message: error.message ?? 'Invalid document',
    })),
  };
}

export { validateRig, validateRigBindings, evaluateRig } from './rigs';
export type { Rig, RigBone, RigAttachment, RigBoneKeyframe, Matrix2D, RigEvaluation } from './rigs';
export { applyRigToSvg } from './rig-svg';
