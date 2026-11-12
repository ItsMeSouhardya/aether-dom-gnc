import { proxyProposalApi } from '@/lib/proposal-proxy';
import type { ProjectParams } from '@/lib/project-proxy';
export async function POST(request: Request, { params }: { params: Promise<ProjectParams & { proposalId: string }> }) {
  const value = await params; return proxyProposalApi(value, { rejectId: value.proposalId }, request);
}
