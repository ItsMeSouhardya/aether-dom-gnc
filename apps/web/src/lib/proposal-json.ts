const MAX_RESPONSE = 3 * 1024 * 1024;

export async function readProposalJson(response: Response | Request, maxBytes = MAX_RESPONSE): Promise<unknown> {
  if (response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new Error('Invalid proposal response type.');
  const reader = response.body?.getReader(); if (!reader) throw new Error('Empty proposal response.');
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.length;
      if (length > maxBytes) { await reader.cancel(); throw new Error('Proposal response exceeds its size limit.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const data = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
}
