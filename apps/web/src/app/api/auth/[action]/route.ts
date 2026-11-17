import { NextRequest, NextResponse } from 'next/server';
import { AuthError, LocalAuth, safeStudioReturn, sessionCookie, sessionSeconds } from '@/lib/local-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ action: string }> };
const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest, context: Context) {
  if ((await context.params).action !== 'session') return NextResponse.json({ message: 'Not found.' }, { status: 404, headers });
  try { return NextResponse.json(new LocalAuth().status(request.cookies.get(sessionCookie)?.value), { headers }); }
  catch { return NextResponse.json({ message: 'The local account store is unavailable. Please try again.' }, { status: 503, headers }); }
}

async function body(request: NextRequest): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new AuthError('Send a JSON form.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError('Complete the form and try again.', 400);
  let length = 0;
  const parts: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8192) { await reader.cancel(); throw new AuthError('The form is too large.', 413); }
      parts.push(value);
    }
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(parts)));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid form');
    return value as Record<string, unknown>;
  } catch (error) { if (error instanceof AuthError) throw error; throw new AuthError('Complete the form and try again.', 400); }
  finally { reader.releaseLock(); }
}

export async function POST(request: NextRequest, context: Context) {
  const { action } = await context.params;
  if (!['register', 'login', 'logout'].includes(action)) return NextResponse.json({ message: 'Not found.' }, { status: 404, headers });
  const expected = `${request.nextUrl.protocol}//${request.headers.get('host') ?? request.nextUrl.host}`;
  if (request.headers.get('origin') !== expected) return NextResponse.json({ message: 'Use this workspace’s login form.' }, { status: 403, headers });
  try {
    const auth = new LocalAuth();
    if (action === 'logout') {
      auth.logout(request.cookies.get(sessionCookie)?.value);
      const response = NextResponse.redirect(new URL('/welcome', expected), 303);
      response.headers.set('Cache-Control', 'no-store');
      response.cookies.set(sessionCookie, '', { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: 0 });
      return response;
    }
    const input = await body(request);
    const token = action === 'register' ? await auth.register(input) : await auth.login(input);
    const response = NextResponse.json({ next: safeStudioReturn(input.next) }, { headers });
    response.cookies.set(sessionCookie, token, { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: sessionSeconds });
    return response;
  } catch (error) {
    return NextResponse.json({ message: error instanceof AuthError ? error.message : 'The local account store is unavailable. Please try again.' }, { status: error instanceof AuthError ? error.status : 503, headers });
  }
}
