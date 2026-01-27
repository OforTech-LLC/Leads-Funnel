import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/callback', '/api/auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Check for portal_token cookie
  const token = request.cookies.get('portal_token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Basic JWT expiration check (without full verification -- that happens server-side)
  try {
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('expired', '1');
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('portal_token');
      return response;
    }
  } catch {
    // If token can't be parsed, redirect to login
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('portal_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
