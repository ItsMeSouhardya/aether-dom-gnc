import { boundedLedgerText, validLedgerIdentity } from './asset-ledger-api';
import type { ProjectAssetParams } from './project-proxy';
const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
export async function proxyAssetLedger(params: ProjectAssetParams, request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams, revisions = query.getAll('revision'), revision = revisions[0];
  if ([...query.keys()].some(key => key !== 'revision') || revisions.length !== 1 || !/^(0|[1-9][0-9]*)$/.test(revision) || !validLedgerIdentity({ ...params, revision: Number(revision) })) return Response.json({ detail: { message: 'Invalid asset identity or revision.' } }, { status: 422, headers });
  try {
    const url = new URL(`/api/v1/projects/${encodeURIComponent(params.projectId)}/branches/${encodeURIComponent(params.branchId)}/assets/${encodeURIComponent(params.assetId)}/ledger?revision=${revision}`, process.env.AETHER_API_ORIGIN ?? 'http://127.0.0.1:8000');
    const upstream = await fetch(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new Error('Invalid ledger response.');
    const body = await boundedLedgerText(upstream);
    return new Response(body, { status: upstream.status, headers });
  } catch { return Response.json({ detail: { message: 'Asset evidence is unavailable. Check the local API and retry.' } }, { status: 502, headers }); }
}
