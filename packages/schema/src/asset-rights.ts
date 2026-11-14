import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../asset-provenance.schema.json';
import commandSchema from '../command.schema.json';
import type { AssetProvenance } from './asset-provenance.generated';
import { sha256Bytes } from './asset-hash';
import { portableJsonWithin } from './portable';
export { portableJsonWithin } from './portable';

export type { AssetProvenance } from './asset-provenance.generated';
export type ExportUse = 'private_preview' | 'public_distribution' | 'commercial_pack';
export type Permission = 'allowed' | 'denied' | 'unknown';
export type Consent = AssetProvenance['consents'][number];
export type EvidenceBlob = { uri: string; sha256: string; text: string };
export type AssetUseDecision = {
  assetId: string;
  use: ExportUse;
  allowed: boolean;
  reasons: string[];
  attribution: string[];
};
const uses: ExportUse[] = ['private_preview', 'public_distribution', 'commercial_pack'];
const encoder = new TextEncoder();
// Shared with Python; JavaScript trim and Python strip disagree on Unicode whitespace.
const whitespace = new Set([
  9, 10, 11, 12, 13, 32, 133, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202,
  8232, 8233, 8239, 8287, 12288, 65279,
]);
const trim = (text: string): string => {
  const scalars = Array.from(text);
  let start = 0;
  let end = scalars.length;
  while (start < end && whitespace.has(scalars[start]!.codePointAt(0)!)) start++;
  while (end > start && whitespace.has(scalars[end - 1]!.codePointAt(0)!)) end--;
  return scalars.slice(start, end).join('');
};
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validate = ajv.compile<AssetProvenance>(schema);
const validateArgs = ajv.compile(commandSchema.$defs.assetEvidenceArgs);

const safeMediaUri = (uri: string) =>
  /^assets\/[A-Za-z0-9_./-]+$/.test(uri) &&
  !uri.split('/').some((part) => !part || part === '.' || part === '..');
const issue = (message: string) => ({ valid: false as const, issues: [{ path: '/', message }] });
export function validateAssetProvenance(
  value: unknown,
): { valid: true; provenance: AssetProvenance } | ReturnType<typeof issue> {
  if (!portableJsonWithin(value, 128 * 1024)) return issue('Provenance must be bounded portable JSON');
  if (!validate(value)) return issue('Malformed asset provenance');
  if (!safeMediaUri(value.original.uri) || !safeMediaUri(value.current.uri)) return issue('Unsafe media URI');
  const hashes = new Set<string>();
  for (const ref of value.evidence) {
    if (ref.uri !== `assets/evidence/${ref.sha256}.txt` || hashes.has(ref.sha256))
      return issue('Duplicate or mismatched evidence reference');
    hashes.add(ref.sha256);
  }
  return { valid: true, provenance: value };
}
export function validateEvidenceArgs(value: unknown): boolean {
  if (!portableJsonWithin(value, 512 * 1024) || !validateArgs(value)) return false;
  const args = value as { expectedAssetUri: string; expectedSourceUri: string; evidence: { text: string }[] };
  if (!safeMediaUri(args.expectedAssetUri) || !safeMediaUri(args.expectedSourceUri)) return false;
  let total = 0;
  const hashes = new Set<string>();
  for (const ref of args.evidence) {
    const data = encoder.encode(ref.text);
    total += data.length;
    const hash = sha256Bytes(data);
    if (data.length > 65536 || total > 262144 || hashes.has(hash)) return false;
    hashes.add(hash);
  }
  return true;
}
export function evaluateAssetUse(
  asset: { id: string; rights: string; uri: string; sourceUri?: string; provenance?: unknown },
  use: ExportUse,
  evidence: EvidenceBlob[] = [],
): AssetUseDecision {
  const reasons: string[] = [];
  const attribution: string[] = [];
  const result = () => ({ assetId: asset.id, use, allowed: reasons.length === 0, reasons, attribution });
  if (!uses.includes(use)) reasons.push('Unknown export use');
  if (!['project_original', 'licensed', 'ai_generated'].includes(asset.rights))
    reasons.push('Asset rights are unknown');
  if (!Object.hasOwn(asset, 'provenance')) {
    if (use !== 'private_preview') reasons.push('Record explicit permission and evidence for this use');
    return result();
  }
  const validation = validateAssetProvenance(asset.provenance);
  if (!validation.valid) {
    reasons.push('Asset provenance is malformed or exceeds limits');
    return result();
  }
  const p = validation.provenance;
  if (p.current.uri !== asset.uri || p.original.uri !== (asset.sourceUri ?? asset.uri))
    reasons.push('Media version binding is stale');
  if (p.permissions[use] !== 'allowed') reasons.push('Recorded permission does not allow this use');
  const verified = new Set<string>();
  if (!portableJsonWithin(evidence, 512 * 1024) || !Array.isArray(evidence) || evidence.length > 8)
    reasons.push('Evidence is malformed or exceeds limits');
  else {
    let total = 0;
    const seen = new Set<string>();
    for (const blob of evidence) {
      if (
        !blob ||
        typeof blob.uri !== 'string' ||
        typeof blob.sha256 !== 'string' ||
        typeof blob.text !== 'string' ||
        Object.keys(blob).sort().join(',') !== 'sha256,text,uri'
      ) {
        reasons.push('Malformed evidence blob');
        continue;
      }
      const bytes = encoder.encode(blob.text);
      total += bytes.length;
      if (
        bytes.length > 65536 ||
        total > 262144 ||
        !trim(blob.text) ||
        blob.uri !== `assets/evidence/${blob.sha256}.txt` ||
        !/^[a-f0-9]{64}$/.test(blob.sha256) ||
        seen.has(blob.sha256) ||
        sha256Bytes(bytes) !== blob.sha256
      )
        reasons.push('Evidence integrity check failed');
      else verified.add(blob.sha256);
      seen.add(blob.sha256);
    }
  }
  if (p.evidence.some((ref) => !verified.has(ref.sha256)))
    reasons.push('Referenced evidence is missing or invalid');
  const referenced = new Set(p.evidence.map((ref) => ref.sha256));
  if (!p.evidence.length) reasons.push('This use requires recorded evidence');
  if (use !== 'private_preview') {
    if (
      [p.creator, p.source, p.license].some((text) => !trim(text) || trim(text).toLowerCase() === 'unknown')
    )
      reasons.push('Record creator, source and license');
  }
  for (const consent of p.consents) {
    if (use !== 'private_preview' && consent.applicability === 'unknown')
      reasons.push(consent.kind + ' consent applicability is unknown');
    if (
      consent.applicability === 'required' &&
      (!trim(consent.subject) ||
        trim(consent.subject).toLowerCase() === 'unknown' ||
        consent.status !== 'allowed' ||
        !consent.uses.includes(use) ||
        !consent.evidenceHashes.length ||
        consent.evidenceHashes.some((hash) => !referenced.has(hash) || !verified.has(hash)))
    )
      reasons.push(consent.kind + ' consent does not cover this use');
  }
  if (trim(p.attribution)) attribution.push(p.attribution);
  return result();
}
