type ApiPath = '/api/v1/health' | '/api/v1/fixtures/neon-shogun';

// Deliberately not a catch-all proxy: Task 00 exposes two read-only resources.
export async function proxyApi(path: ApiPath): Promise<Response> {
  try {
    const origin = process.env.AETHER_API_ORIGIN ?? 'http://127.0.0.1:8000';
    const upstream = await fetch(new URL(path, origin), {
      cache: 'no-store', signal: AbortSignal.timeout(4000),
    });
    if (!upstream.ok) return Response.json({ error: 'Local API unavailable' }, { status: 502 });
    const payload: unknown = await upstream.json();
    return Response.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Local API unavailable' }, { status: 502 });
  }
}
