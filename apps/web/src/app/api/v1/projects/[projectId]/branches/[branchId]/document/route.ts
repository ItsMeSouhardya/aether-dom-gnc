import { proxyProjectApi, type ProjectParams } from '@/lib/project-proxy';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: { params: Promise<ProjectParams> }) {
  return proxyProjectApi(await context.params, 'document');
}
