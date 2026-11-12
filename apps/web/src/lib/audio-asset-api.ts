import type { CdomDocument } from '@aether-dom/schema';
import { projectBase } from './project-api';

export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
type AudioDocument = { project: Pick<CdomDocument['project'], 'id' | 'activeBranchId' | 'revision'> };

export async function readAudioBytes(response: Response): Promise<ArrayBuffer> {
  if (response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'audio/wav') throw new Error('The audio response is not a supported WAV file.');
  const declared = response.headers.get('Content-Length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_AUDIO_BYTES)) throw new Error('The audio file exceeds the 8 MiB limit.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('The audio response is empty.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_AUDIO_BYTES) { await reader.cancel(); throw new Error('The audio file exceeds the 8 MiB limit.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  if (size < 44 || String.fromCharCode(...bytes.subarray(0, 4)) !== 'RIFF' || String.fromCharCode(...bytes.subarray(8, 12)) !== 'WAVE') throw new Error('The audio response is not a valid WAV file.');
  return bytes.buffer;
}

export async function loadAudioAsset(document: AudioDocument, asset: { id: string; uri: string }, signal: AbortSignal): Promise<ArrayBuffer> {
  const response = await fetch(`${projectBase(document.project.id, document.project.activeBranchId)}/audio/${encodeURIComponent(asset.id)}?revision=${document.project.revision}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]), cache: 'no-store' });
  if (!response.ok) {
    const value: unknown = await response.json();
    const detail = value && typeof value === 'object' && 'detail' in value ? value.detail : null;
    throw new Error(detail && typeof detail === 'object' && 'message' in detail && typeof detail.message === 'string' ? detail.message : 'The local audio asset is unavailable.');
  }
  return readAudioBytes(response);
}
