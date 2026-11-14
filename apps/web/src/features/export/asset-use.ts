import { evaluateAssetUse, type ExportUse, type PlayerManifest } from '@aether-dom/schema';

/** Recompute policy for the media actually embedded in the validated bundle. */
export function decisionsForUse(manifest: PlayerManifest, use: ExportUse) {
  return manifest.assets.map(entry => {
    const asset = manifest.document.assets.find(item => item.id === entry.assetId);
    if (!asset) throw new Error(`Missing metadata for asset ${entry.assetId}.`);
    const refs = new Set(asset.provenance?.evidence.map(item => item.sha256) ?? []);
    return evaluateAssetUse(asset, use, (manifest.evidence ?? []).filter(item => refs.has(item.sha256)));
  });
}
