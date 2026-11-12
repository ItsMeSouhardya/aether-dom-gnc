import { proxyProjectApi, type ProjectParams } from '@/lib/project-proxy';

export async function GET(_request: Request, context: { params: Promise<ProjectParams> }) {
  return proxyProjectApi(await context.params, 'diagnostics');
}
