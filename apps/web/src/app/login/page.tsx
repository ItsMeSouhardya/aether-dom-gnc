import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LocalAuth, safeStudioReturn, sessionCookie } from '@/lib/local-auth';
import { LoginForm } from '@/components/auth/login-form';
import { Icon } from '@/components/studio/icons';
import './login.css';

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = safeStudioReturn((await searchParams).next);
  let status;
  try { status = new LocalAuth().status((await cookies()).get(sessionCookie)?.value); }
  catch { return <main className="login-page"><section className="login-card"><h1>Account unavailable</h1><p role="alert">The local account store could not be opened. Try again after checking the local server.</p><a href="/welcome">Back to the homepage</a></section></main>; }
  if (status.user) redirect(next);
  return <main className="login-page"><a className="login-brand" href="/welcome" aria-label="AETHER-DOM home"><Icon name="brand" /><span>AETHER-DOM</span></a><section className="login-card"><LoginForm configured={status.configured} next={next} /></section><a className="login-back" href="/welcome">Back to the homepage</a></main>;
}
