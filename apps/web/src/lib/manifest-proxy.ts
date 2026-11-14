import type { ProjectParams } from './project-proxy';

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
async function boundedBytes(response: Response, limit: number) {
  const declared = response.headers.get('Content-Length');
  if (response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json'
    || declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new Error('Invalid manifest response.');
  const reader = response.body?.getReader(); if (!reader) throw new Error('Empty manifest response.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new Error('Manifest exceeds32MiB.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const data = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return data;
}

export async function proxyPlayerManifest(params: ProjectParams, request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams, revisions = query.getAll('revision'), downloads = query.getAll('download'), uses = query.getAll('use');
  const revision = revisions[0], download = downloads[0], use = uses[0];
  if ([params.projectId, params.branchId].some(id => !id || id === '.' || id === '..')
    || [...query.keys()].some(key => key !== 'revision' && key !== 'download' && key !== 'use') || revisions.length > 1 || downloads.length > 1 || uses.length > 1
    || revision !== undefined && (!/^(0|[1-9][0-9]*)$/.test(revision) || !Number.isSafeInteger(Number(revision)))
    || download !== undefined && download !== '1'
    || use !== undefined && !['private_preview', 'public_distribution', 'commercial_pack'].includes(use)) {
    return Response.json({ detail: { message: 'Choose a valid project, branch and saved revision.' } }, { status: 422, headers });
  }
  try {
    const url = new URL(`/api/v1/projects/${encodeURIComponent(params.projectId)}/branches/${encodeURIComponent(params.branchId)}/player-manifest`, process.env.AETHER_API_ORIGIN ?? 'http://127.0.0.1:8000');
    if (revision !== undefined) url.searchParams.set('revision', revision);
    if (download) url.searchParams.set('download', '1');
    if (use) url.searchParams.set('use', use);
    const upstream = await fetch(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
    const data = await boundedBytes(upstream, upstream.ok ? 32 * 1024 * 1024 : 64 * 1024);
    if (!upstream.ok) return new Response(data, { status: upstream.status, headers: { ...headers, 'Content-Type': 'application/json' } });
    return new Response(data, { headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': String(data.length), ...(download ? { 'Content-Disposition': `attachment; filename="aether-dom-${revision === undefined ? 'saved' : `r${revision}`}.cdom.json"` } : {}) } });
  } catch {
    return Response.json({ detail: { message: 'The saved player manifest is unavailable or exceeds its limits. Check the local API and retry.' } }, { status: 502, headers });
  }
}
