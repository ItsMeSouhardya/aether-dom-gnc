import { proxyProposalApi } from '@/lib/proposal-proxy';
import type { ProjectParams } from '@/lib/project-proxy';
export async function GET(request: Request, { params }: { params: Promise<ProjectParams> }) { return proxyProposalApi(await params, 'list', request); }
export async function POST(request: Request, { params }: { params: Promise<ProjectParams> }) { return proxyProposalApi(await params, 'create', request); }
