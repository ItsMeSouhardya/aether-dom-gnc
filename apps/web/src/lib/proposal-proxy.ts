import type { ProjectParams } from './project-proxy';
import { readProposalJson } from './proposal-json';
type Action = 'list' | 'create' | { rejectId: string };

export async function proxyProposalApi(params: ProjectParams, action: Action, request?: Request): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' };
  const error = (status: number, message: string) => Response.json({ detail: { message } }, { status, headers });
  const ids = [params.projectId, params.branchId, ...(typeof action === 'object' ? [action.rejectId] : [])];
  if (ids.some(id => !id || id === '.' || id === '..') || request && new URL(request.url).search) return error(422, 'A valid fixed proposal resource is required.');
  const writing = action !== 'list';
  let body: string | undefined;
  if (writing) {
    if (!request || request.method !== 'POST') return error(405, 'POST required.');
    const url = new URL(request.url), origin = request.headers.get('Origin');
    const expected = request.headers.get('Host') ? `${url.protocol}//${request.headers.get('Host')}` : url.origin;
    if (origin && origin !== expected) return error(403, 'Same-origin request required.');
    if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return error(415, 'JSON required.');
    try { body = JSON.stringify(await readProposalJson(request, 16384)); }
    catch { return error(422, 'A bounded JSON proposal request is required.'); }
  }
  try {
    const suffix = typeof action === 'object' ? `/${encodeURIComponent(action.rejectId)}/reject` : '';
    const path = `/api/v1/projects/${encodeURIComponent(params.projectId)}/branches/${encodeURIComponent(params.branchId)}/agent-proposals${suffix}`;
    const upstream = await fetch(new URL(path, process.env.AETHER_API_ORIGIN ?? 'http://127.0.0.1:8000'), { method: writing ? 'POST' : 'GET', ...(writing ? { headers: { 'Content-Type': 'application/json' }, body } : {}), cache: 'no-store', signal: AbortSignal.timeout(8000) });
    return Response.json(await readProposalJson(upstream), { status: upstream.status, headers });
  } catch { return error(502, 'The local proposal service is unavailable.'); }
}
