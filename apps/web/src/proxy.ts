import { NextRequest, NextResponse } from 'next/server';
import { LocalAuth, sessionCookie, safeStudioReturn } from './lib/local-auth';

export function proxy(request: NextRequest) {
  try {
    const token = request.cookies.get(sessionCookie)?.value;
    if (token && new LocalAuth().status(token).user) {
      const response = NextResponse.next(); response.headers.set('Cache-Control', 'no-store'); return response;
    }
    if (request.nextUrl.pathname.startsWith('/api/')) return NextResponse.json({ detail: { message: 'Log in to open this workspace.' } }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    const url = new URL('/login', `${request.nextUrl.protocol}//${request.headers.get('host') ?? request.nextUrl.host}`);
    url.searchParams.set('next', safeStudioReturn(request.nextUrl.pathname + request.nextUrl.search));
    return NextResponse.redirect(url);
  } catch { return new NextResponse('The local account store is unavailable. Please try again.', { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}

export const config = { matcher: ['/studio/:path*', '/api/v1/projects/:path*'] };
