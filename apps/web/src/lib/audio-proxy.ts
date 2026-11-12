import type { ProjectAssetParams } from './project-proxy';
import { readAudioBytes } from './audio-asset-api';

export async function proxyAudioAsset(params: ProjectAssetParams, request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams, revisions = query.getAll('revision'), raw = revisions[0];
  const headers = { 'Cache-Control': 'no-store' };
  if ([params.projectId, params.branchId, params.assetId].some(id => !id || id === '.' || id === '..')
    || [...query.keys()].some(key => key !== 'revision') || revisions.length > 1
    || raw !== undefined && (!/^(0|[1-9][0-9]*)$/.test(raw) || !Number.isSafeInteger(Number(raw)))) {
    return Response.json({ detail: { message: 'A valid audio asset and nonnegative revision are required.' } }, { status: 422, headers });
  }
  try {
    const path = `/api/v1/projects/${encodeURIComponent(params.projectId)}/branches/${encodeURIComponent(params.branchId)}/audio/${encodeURIComponent(params.assetId)}${raw === undefined ? '' : `?revision=${raw}`}`;
    const upstream = await fetch(new URL(path, process.env.AETHER_API_ORIGIN ?? 'http://127.0.0.1:8000'), { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (!upstream.ok) return Response.json(await upstream.json(), { status: upstream.status, headers });
    const bytes = await readAudioBytes(upstream);
    return new Response(bytes, { headers: { ...headers, 'Content-Type': 'audio/wav', 'Content-Length': String(bytes.byteLength), 'X-Content-Type-Options': 'nosniff' } });
  } catch { return Response.json({ detail: { message: 'The local audio asset is unavailable or invalid.' } }, { status: 502, headers }); }
}
