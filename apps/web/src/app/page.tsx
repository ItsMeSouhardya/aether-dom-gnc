import { redirect } from 'next/navigation';
import { welcomeHref } from '@/lib/welcome-navigation';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  redirect(welcomeHref(typeof query.projectId === 'string' ? query.projectId : undefined, typeof query.branchId === 'string' ? query.branchId : undefined));
}
