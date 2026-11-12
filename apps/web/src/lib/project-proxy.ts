export type ProjectParams = { projectId: string; branchId: string };
export type ProjectAssetParams = ProjectParams & { assetId: string };
type ProjectResource = 'document' | 'commands' | 'diagnostics' | { assetId: string; revision?: number };

export async function proxyProjectApi(params: ProjectParams, resource: ProjectResource, request?: Request): Promise<Response> {
  if (resource === 'commands') {
    if (!request || request.method !== 'POST') return Response.json({ detail: { message: 'POST required' } }, { status: 405 });
    const origin = request.headers.get('Origin');
    // Next can normalize request.url to its internal localhost address. Host
    // represents the browser-facing authority; forwarded headers are not trusted.
    const url = new URL(request.url);
    const expectedOrigin = request.headers.get('Host') ? `${url.protocol}//${request.headers.get('Host')}` : url.origin;
    if (origin && origin !== expectedOrigin) return Response.json({ detail: { message: 'Same-origin request required' } }, { status: 403 });
    if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return Response.json({ detail: { message: 'JSON required' } }, { status: 415 });
  }
  try {
    const origin = process.env.AETHER_API_ORIGIN ?? 'http://127.0.0.1:8000';
    const suffix = typeof resource === 'string' ? resource
      : `assets/${encodeURIComponent(resource.assetId)}${resource.revision === undefined ? '' : `?revision=${resource.revision}`}`;
    const path = `/api/v1/projects/${encodeURIComponent(params.projectId)}/branches/${encodeURIComponent(params.branchId)}/${suffix}`;
    const upstream = await fetch(new URL(path, origin), { method: resource === 'commands' ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' }, body: resource === 'commands' ? await request!.text() : undefined,
      cache: 'no-store', signal: AbortSignal.timeout(6000) });
    const payload: unknown = await upstream.json();
    return Response.json(payload, { status: upstream.status, headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ detail: { code: 'UPSTREAM_UNAVAILABLE', message: 'The local API is unavailable.' } }, { status: 502, headers: { 'Cache-Control': 'no-store' } }); }
}

export async function proxyProjectAssetApi(params: ProjectAssetParams, request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const revisions = query.getAll('revision');
  const raw = revisions[0];
  if ([params.projectId,params.branchId,params.assetId].some(id => !id || id === '.' || id === '..')
    || [...query.keys()].some(key => key !== 'revision') || revisions.length > 1
    || (raw !== undefined && (!/^(0|[1-9][0-9]*)$/.test(raw) || !Number.isSafeInteger(Number(raw))))) {
    return Response.json({detail:{code:'INVALID_ASSET_REQUEST',message:'A valid asset ID and optional nonnegative revision are required.'}}, {status:422,headers:{'Cache-Control':'no-store'}});
  }
  return proxyProjectApi(params,{assetId:params.assetId,...(raw === undefined ? {} : {revision:Number(raw)})});
}
