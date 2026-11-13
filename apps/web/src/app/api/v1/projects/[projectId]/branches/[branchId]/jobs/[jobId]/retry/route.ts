import { proxyJobApi } from '@/lib/job-proxy';
import type { ProjectParams } from '@/lib/project-proxy';
export async function POST(request: Request, context: { params: Promise<ProjectParams & { jobId: string }> }) {
  const params = await context.params; return proxyJobApi(params, { jobId: params.jobId, action: 'retry' }, request);
}
