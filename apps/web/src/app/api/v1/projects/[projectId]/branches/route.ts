import { proxyBranches } from '@/lib/branch-proxy';
type Context = { params: Promise<{ projectId: string }> };
export async function GET(request: Request, context: Context) { return proxyBranches((await context.params).projectId, 'branches', request); }
export async function POST(request: Request, context: Context) { return proxyBranches((await context.params).projectId, 'branches', request); }
