import { decodeManifestAudio, type PlayerManifest } from '@aether-dom/schema';
import type { AudioDependencies } from '../audio/engine';
import { assetKey, type AssetState } from '../stage/asset-state';

export function embeddedSvgAssets(manifest: PlayerManifest): Record<string, AssetState> {
  const entries: Record<string, AssetState> = {};
  for (const asset of manifest.assets) {
    if (asset.kind === 'svg') entries[assetKey({ id: asset.assetId, uri: asset.svg.uri })] = { svg: asset.svg };
  }
  return entries;
}

/** The player loader deliberately has no network fallback. */
export function embeddedAudioLoader(manifest: PlayerManifest): NonNullable<AudioDependencies['loadAsset']> {
  const audio = new Map(manifest.assets.filter(asset => asset.kind === 'audio').map(asset => [asset.assetId, asset]));
  const metadata = new Map(manifest.document.assets.map(asset => [asset.id, asset]));
  return async (_document, asset, signal) => {
    signal.throwIfAborted();
    const embedded = audio.get(asset.id), saved = metadata.get(asset.id);
    if (!embedded || saved?.kind !== 'audio' || saved.uri !== asset.uri) throw new Error('The audio source is not embedded in this player file. Export the saved project again.');
    return decodeManifestAudio(embedded.dataBase64);
  };
}

export function playerRevision(query: Record<string, string | string[] | undefined>): { projectId?: string; branchId?: string; revision?: number; error?: string } {
  const value = query.revision;
  const projectId = query.projectId, branchId = query.branchId;
  const badIdentity = (projectId === undefined) !== (branchId === undefined) || [projectId, branchId].some(id => id !== undefined && (typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id)));
  if (badIdentity || Object.keys(query).some(key => !['revision', 'projectId', 'branchId'].includes(key)) || value !== undefined && (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value) || !Number.isSafeInteger(Number(value)))) return { error: 'The player revision or project address is invalid. Return to the studio and open the saved revision, or choose a local JSON file.' };
  return { ...(value === undefined ? {} : { revision: Number(value) }), ...(typeof projectId === 'string' && typeof branchId === 'string' ? { projectId, branchId } : {}) };
}
