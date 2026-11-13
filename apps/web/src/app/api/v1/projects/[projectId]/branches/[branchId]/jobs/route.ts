import { proxyJobApi } from '@/lib/job-proxy';
import type { ProjectParams } from '@/lib/project-proxy';
type Context = { params: Promise<ProjectParams> };
export async function GET(request: Request, context: Context) { return proxyJobApi(await context.params, 'list', request); }
export async function POST(request: Request, context: Context) { return proxyJobApi(await context.params, 'create', request); }
