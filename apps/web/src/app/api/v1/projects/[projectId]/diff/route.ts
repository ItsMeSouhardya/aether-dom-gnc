import { proxyBranches } from '@/lib/branch-proxy';
export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) { return proxyBranches((await context.params).projectId, 'diff', request); }
