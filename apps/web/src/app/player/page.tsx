import type { Metadata } from 'next';
import { PlayerLoader } from '@/components/player/player-loader';
import { playerRevision } from '@/features/player/manifest';
import './player.css';

export const metadata: Metadata = { title: 'AETHER-DOM — Player', description: 'Play a saved composition or open a portable local player bundle.' };

export default async function PlayerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const request = playerRevision(await searchParams);
  return <PlayerLoader key={`${request.projectId}:${request.branchId}:${request.revision}:${request.error}`} projectId={request.projectId} branchId={request.branchId} revision={request.revision} initialError={request.error} />;
}
