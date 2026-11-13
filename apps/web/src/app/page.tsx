import StudioLoader from '@/components/studio/studio-loader';
import { studioScope } from '@/features/studio/scope';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const scope = studioScope(await searchParams);
  return <>
    <a className="skip-link" href="#studio">Skip to studio</a>
    <StudioLoader key={`${scope.projectId}:${scope.branchId}:${scope.error ?? ''}`} projectId={scope.projectId} branchId={scope.branchId} initialError={scope.error} />
  </>;
}
