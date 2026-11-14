import { evaluateAssetUse, validateAssetProvenance, type ExportUse } from '@aether-dom/schema';
import type { AssetLedger } from '@/lib/asset-ledger-api';

const uses: ExportUse[] = ['private_preview', 'public_distribution', 'commercial_pack'];
type Asset = Parameters<typeof evaluateAssetUse>[0];

/** Policy remains shared; inspection adds the actual revision-bound media observations. */
export function inspectedAssetDecisions(asset: Asset, ledger: AssetLedger | null) {
  let integrity = !ledger || !!ledger.error || !ledger.original || !ledger.current;
  if (ledger?.original && ledger.current) {
    integrity ||= ledger.original.uri !== (asset.sourceUri ?? asset.uri) || ledger.current.uri !== asset.uri;
    if (Object.hasOwn(asset, 'provenance')) {
      const checked = validateAssetProvenance(asset.provenance);
      if (checked.valid) {
        const p = checked.provenance;
        integrity ||= p.original.uri !== ledger.original.uri || p.original.sha256 !== ledger.original.sha256 ||
          p.current.uri !== ledger.current.uri || p.current.sha256 !== ledger.current.sha256 ||
          p.current.payloadSha256 !== ledger.current.payloadSha256;
      }
    }
  }
  return uses.map(use => {
    const decision = evaluateAssetUse(asset, use, ledger?.evidence ?? []);
    return integrity ? { ...decision, allowed: false, reasons: [...decision.reasons, 'Media or evidence inspection is unavailable or failed integrity verification'] } : decision;
  });
}
