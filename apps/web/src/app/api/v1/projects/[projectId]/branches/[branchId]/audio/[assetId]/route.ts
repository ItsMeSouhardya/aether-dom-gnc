import { proxyAudioAsset } from '@/lib/audio-proxy';
import type { ProjectAssetParams } from '@/lib/project-proxy';

export async function GET(request: Request, { params }: { params: Promise<ProjectAssetParams> }) {
  return proxyAudioAsset(await params, request);
}
