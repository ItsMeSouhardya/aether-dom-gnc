import { proxyPlayerManifest } from '@/lib/manifest-proxy';
export async function GET(request: Request, context: { params: Promise<{ projectId: string; branchId: string }> }) {
  return proxyPlayerManifest(await context.params, request);
}
