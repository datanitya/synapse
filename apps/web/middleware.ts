import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/callback', '/', '/privacy', '/terms', '/contact'];
const PROTECTED_PATHS = ['/dashboard', '/trends', '/compose', '/drafts', '/content-bank', '/notifications', '/settings', '/billing', '/profile', '/admin', '/onboarding'];

function getTokenFromCookie(request: NextRequest): string | null {
  return request.cookies.get('synapse_token')?.value ?? null;
}

function parseJwtPayload(token: string): { onboardingComplete?: boolean; role?: string } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = getTokenFromCookie(request);

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = parseJwtPayload(token);

  // Admin-only routes
  if (pathname.startsWith('/admin') && payload?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!payload?.onboardingComplete && pathname !== '/onboarding') {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  if (payload?.onboardingComplete && pathname === '/onboarding') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
