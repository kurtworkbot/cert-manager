import { NextRequest, NextResponse } from 'next/server';
import { getSessionByToken } from '@/lib/db';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require auth
  const publicPaths = [
    '/login',
    '/api/auth/login',
    '/api/auth/logout',
    '/.well-known/acme-challenge',
  ];

  // Check if path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    // Redirect to login for page requests
    if (!pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Return 401 for API requests
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Note: We can't call DB functions directly in Edge middleware
  // Session validation will be done in API routes
  // For now, just check if cookie exists

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
};
