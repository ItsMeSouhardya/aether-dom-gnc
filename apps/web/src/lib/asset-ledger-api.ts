import { sha256Bytes, type EvidenceBlob } from '@aether-dom/schema';
import { projectBase } from './project-api';

export type LedgerIdentity = { projectId: string; branchId: string; assetId: string; revision: number };
type Binding = { uri: string; sha256: string; payloadSha256?: string };
export type AssetLedger = LedgerIdentity & { original: Binding | null; current: Binding | null; evidence: EvidenceBlob[]; error: string | null };
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const hex = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const validLedgerIdentity = (id: LedgerIdentity) => [id.projectId, id.branchId].every(value => /^[A-Za-z0-9_-]{1,128}$/.test(value)) && !['.', '..'].includes(id.assetId) && Array.from(id.assetId).length > 0 && Array.from(id.assetId).length <= 128 && !/[\\/\u0000-\u001f\ud800-\udfff]/u.test(id.assetId) && Number.isSafeInteger(id.revision) && id.revision >= 0;
export async function boundedLedgerText(response: Response): Promise<string> {
  const limit = 2 * 1024 * 1024, length = response.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) throw new Error('Ledger response exceeds its limit.');
  if (!response.body) throw new Error('The ledger response is empty.');
  const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true }); let size = 0, text = '';
  try { while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > limit) throw new Error('Ledger response exceeds its limit.'); text += decoder.decode(chunk.value, { stream: true }); } return text + decoder.decode(); }
  catch (error) { await reader.cancel().catch(() => {}); throw error; } finally { reader.releaseLock(); }
}
export async function loadAssetLedger(id: LedgerIdentity, signal?: AbortSignal): Promise<AssetLedger> {
  if (!validLedgerIdentity(id)) throw new Error('Invalid asset identity.');
  const response = await fetch(`${projectBase(id.projectId, id.branchId)}/assets/${encodeURIComponent(id.assetId)}/ledger?revision=${id.revision}`, { cache: 'no-store', signal });
  const raw = await boundedLedgerText(response); if (!response.ok) throw new Error('Asset evidence is unavailable. Check the API and retry.');
  const value: unknown = JSON.parse(raw);
  if (!record(value) || value.projectId !== id.projectId || value.branchId !== id.branchId || value.assetId !== id.assetId || value.revision !== id.revision) throw new Error('Ledger response does not match the requested asset.');
  const binding = (item: unknown, current: boolean) => item === null || record(item) && typeof item.uri === 'string' && item.uri.length <= 2048 && hex(item.sha256) && (!current || hex(item.payloadSha256));
  if (!binding(value.original, false) || !binding(value.current, true) || !(value.error === null || typeof value.error === 'string' && value.error.length <= 2000) || !Array.isArray(value.evidence) || value.evidence.length > 8) throw new Error('Invalid ledger response.');
  let total = 0; const seen = new Set<string>();
  for (const item of value.evidence) {
    if (!record(item) || typeof item.text !== 'string' || typeof item.sha256 !== 'string' || !hex(item.sha256) || item.uri !== `assets/evidence/${item.sha256}.txt` || seen.has(item.sha256)) throw new Error('Invalid evidence.');
    const bytes = new TextEncoder().encode(item.text); total += bytes.length;
    if (bytes.length > 65536 || total > 262144 || sha256Bytes(bytes) !== item.sha256) throw new Error('Evidence integrity check failed.');
    seen.add(item.sha256);
  }
  return value as AssetLedger;
}
