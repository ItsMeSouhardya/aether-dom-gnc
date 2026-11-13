import type { ProjectParams } from './project-proxy';
import { readProposalJson } from './proposal-json';

type Action = 'list' | 'create' | { jobId: string; action: 'get' | 'result' | 'cancel' | 'retry' };
async function rawBody(request: Request, limit: number): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Empty request');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new Error('Request exceeds bound'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  // Keep the exact UTF-8 JSON, including duplicate keys and a possible BOM, for
  // the server's strict parser. Parsing/reserializing here would erase evidence.
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
}
export async function proxyJobApi(params: ProjectParams, action: Action, request: Request): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' };
  const error = (status: number, message: string) => Response.json({ detail: { message } }, { status, headers });
  const ids = [params.projectId, params.branchId, ...(typeof action === 'object' ? [action.jobId] : [])];
  if (ids.some(id => !/^[A-Za-z0-9_-]{1,128}$/.test(id)) || new URL(request.url).search) return error(422, 'A fixed branch job resource is required.');
  const writing = action === 'create' || typeof action === 'object' && ['cancel', 'retry'].includes(action.action);
  if (request.method !== (writing ? 'POST' : 'GET')) return error(405, writing ? 'POST required.' : 'GET required.');
  let body: string | undefined;
  if (writing) {
    const url = new URL(request.url), origin = request.headers.get('Origin');
    const expected = request.headers.get('Host') ? `${url.protocol}//${request.headers.get('Host')}` : url.origin;
    if (origin && origin !== expected) return error(403, 'Same-origin request required.');
    if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return error(415, 'JSON required.');
    try {
      body = await rawBody(request, action === 'create' ? 8192 : 64);
      if (action !== 'create') {
        const value: unknown = JSON.parse(body);
        if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).length) return error(422, 'A job decision requires an empty object.');
      }
    } catch { return error(422, 'A bounded JSON job request is required.'); }
  }
  try {
    const suffix = typeof action === 'object' ? `/${action.jobId}${action.action === 'get' ? '' : `/${action.action}`}` : '';
    const path = `/api/v1/projects/${params.projectId}/branches/${params.branchId}/jobs${suffix}`;
    const response = await fetch(new URL(path, process.env.AETHER_API_ORIGIN ?? 'http://127.0.0.1:8000'), { method: writing ? 'POST' : 'GET', ...(writing ? { headers: { 'Content-Type': 'application/json' }, body } : {}), cache: 'no-store', signal: AbortSignal.timeout(8000) });
    return Response.json(await readProposalJson(response, 1024 * 1024), { status: response.status, headers });
  } catch { return error(502, 'The local job service is unavailable. Refresh jobs.'); }
}
