import { proxyAssetLedger } from '@/lib/asset-ledger-proxy';
import type { ProjectAssetParams } from '@/lib/project-proxy';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<ProjectAssetParams> }) {
  return proxyAssetLedger(await context.params, request);
}
