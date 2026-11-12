import { proxyProjectAssetApi, type ProjectAssetParams } from '@/lib/project-proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<ProjectAssetParams> }) {
  return proxyProjectAssetApi(await context.params, request);
}
