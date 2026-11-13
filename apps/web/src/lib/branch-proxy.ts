import { safeRouteId } from '../features/studio/scope';
import { readBranchJson } from './branch-json';
export async function proxyBranches(projectId: string, resource: 'branches' | 'diff', request: Request): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' };
  const error = (status: number, message: string) => Response.json({ detail: { message } }, { status, headers });
  const query = new URL(request.url).searchParams;
  if (!safeRouteId(projectId)) return error(422, 'Invalid project.');
  if (resource === 'branches' ? [...query.keys()].length > 0
    : [...query.keys()].some(key => key !== 'left' && key !== 'right') || query.getAll('left').length !== 1 || query.getAll('right').length !== 1 || !safeRouteId(query.get('left')) || !safeRouteId(query.get('right'))) return error(422, 'Choose two valid branch IDs.');
  const writing = request.method === 'POST';
  if (request.method !== 'GET' && !(writing && resource === 'branches')) return error(405, 'Unsupported branch action.');
  let body: string | undefined;
  if (writing) {
    const url = new URL(request.url), origin = request.headers.get('Origin');
    const expected = request.headers.get('Host') ? `${url.protocol}//${request.headers.get('Host')}` : url.origin;
    if (origin && origin !== expected) return error(403, 'Same-origin request required.');
    if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return error(415, 'JSON required.');
    try { body = JSON.stringify(await readBranchJson(request, 16384)); } catch { return error(413, 'A valid JSON fork command up to16KiB is required.'); }
  }
  try {
    const url = new URL(`/api/v1/projects/${encodeURIComponent(projectId)}/${resource}`, process.env.AETHER_API_ORIGIN ?? 'http://127.0.0.1:8000');
    if (resource === 'diff') { url.searchParams.set('left', query.get('left')!); url.searchParams.set('right', query.get('right')!); }
    const upstream = await fetch(url, { method: writing ? 'POST' : 'GET', ...(writing ? { headers: { 'Content-Type': 'application/json' }, body } : {}), redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000) });
    return Response.json(await readBranchJson(upstream), { status: upstream.status, headers });
  } catch { return error(502, 'The local branch service is unavailable or returned an invalid response.'); }
}
