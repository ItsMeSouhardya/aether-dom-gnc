export async function readBranchJson(response: Response | Request, limit = 1024 * 1024): Promise<unknown> {
  const length = response.headers.get('Content-Length');
  if (response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new Error('JSON required.');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) throw new Error('JSON exceeds its size limit.');
  const reader = response.body?.getReader(); if (!reader) throw new Error('Empty JSON response.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new Error('JSON exceeds its size limit.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
