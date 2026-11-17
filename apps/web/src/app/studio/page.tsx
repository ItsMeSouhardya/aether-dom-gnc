import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import StudioLoader from '@/components/studio/studio-loader';
import { studioScope } from '@/features/studio/scope';
import { LocalAuth, sessionCookie } from '@/lib/local-auth';
import { SessionGuard } from '@/components/auth/session-guard';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!new LocalAuth().status((await cookies()).get(sessionCookie)?.value).user) redirect('/login');
  const scope = studioScope(await searchParams);
  return <><SessionGuard /><a className="skip-link" href="#studio">Skip to studio</a><StudioLoader key={`${scope.projectId}:${scope.branchId}:${scope.error ?? ''}`} projectId={scope.projectId} branchId={scope.branchId} initialError={scope.error} /></>;
}
