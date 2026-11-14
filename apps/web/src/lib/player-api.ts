import { parsePlayerManifest as parseManifest, type PlayerManifest, type ExportUse } from '@aether-dom/schema';
import { projectBase } from './project-api';

export class PlayerExportError extends Error { constructor(message: string, public assetIds: string[]) { super(message); } }

export const MAX_PLAYER_BYTES = 32 * 1024 * 1024;
const tooLarge = () => new Error('The player JSON exceeds 32 MiB. Open a smaller exported bundle.');

/** Native JSON parsing is followed by bounded shared validation before any renderer sees it. */
export function parsePlayerManifest(raw: string): PlayerManifest {
  if (raw.length > MAX_PLAYER_BYTES || new TextEncoder().encode(raw).byteLength > MAX_PLAYER_BYTES) throw tooLarge();
  const result = parseManifest(raw);
  if (!result.valid) throw new Error(`The player bundle is invalid. ${result.issues[0]?.message ?? 'Export the saved project again.'}`);
  return result.manifest;
}

async function boundedText(response: Response): Promise<string> {
  const length = response.headers.get('content-length');
  if (length !== null && Number(length) > MAX_PLAYER_BYTES) { await response.body?.cancel(); throw tooLarge(); }
  if (!response.body) throw new Error('The API returned an empty player bundle. Try again.');
  const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
  let total = 0, text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > MAX_PLAYER_BYTES) throw tooLarge();
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
}

export async function loadPlayerManifest(projectId: string, branchId: string, revision?: number, signal?: AbortSignal, use?: ExportUse): Promise<PlayerManifest> {
  if (![projectId, branchId].every(id => /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id))) throw new Error('The player project or branch is invalid. Return to the studio.');
  if (revision !== undefined && (!Number.isSafeInteger(revision) || revision < 0)) throw new Error('The player revision is invalid. Open the player from the saved studio revision.');
  if (use !== undefined && !['private_preview', 'public_distribution', 'commercial_pack'].includes(use)) throw new Error('The export use is invalid.');
  signal?.throwIfAborted();
  const timeout = AbortSignal.timeout(15000), combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const query = new URLSearchParams();
  if (revision !== undefined) query.set('revision', String(revision));
  if (use !== undefined) query.set('use', use);
  let response: Response;
  try { response = await fetch(`${projectBase(projectId, branchId)}/player-manifest${query.size ? `?${query}` : ''}`,  { cache: 'no-store', signal: combined }); }
  catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('The local API is unavailable. Start the API and try again, or open an exported JSON file.');
  }
  const raw = await boundedText(response);
  if (!response.ok) {
    let detail: unknown;
    try { const value: unknown = JSON.parse(raw); detail = typeof value === 'object' && value !== null && 'detail' in value ? value.detail : null; } catch { /* A proxy can return non-JSON failures. */ }
    const message = typeof detail === 'object' && detail !== null && 'message' in detail && typeof detail.message === 'string' ? detail.message : 'The player bundle is unavailable. Check the API and try again, or open an exported JSON file.';
    const ids = typeof detail === 'object' && detail !== null && 'assetIds' in detail && Array.isArray(detail.assetIds) ? detail.assetIds.filter((id): id is string => typeof id === 'string').slice(0, 64) : [];
    throw new PlayerExportError(message, ids);
  }
  const manifest = parsePlayerManifest(raw), project = manifest.document.project;
  if (use !== undefined && (manifest.exportUse ?? 'private_preview') !== use) throw new Error('The player bundle does not match the requested use.');
  if (project.id !== projectId || project.activeBranchId !== branchId || revision !== undefined && project.revision !== revision) throw new Error('The player bundle does not match the requested saved revision, project or branch. Return to the studio and reopen the player.');
  return manifest;
}

export async function readPlayerFile(file: File): Promise<PlayerManifest> {
  if (file.size > MAX_PLAYER_BYTES) throw tooLarge();
  let raw: string;
  try {
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_PLAYER_BYTES) throw tooLarge();
    raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (error) {
    if (error instanceof Error && error.message.includes('32 MiB')) throw error;
    throw new Error('The file could not be read as UTF-8 JSON. Choose the exported JSON file again.');
  }
  return parsePlayerManifest(raw);
}
