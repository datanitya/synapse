import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/callback', '/privacy', '/terms', '/contact'];
const PROTECTED_PATHS = [
  '/dashboard',
  '/trends',
  '/compose',
  '/drafts',
  '/content-bank',
  '/notifications',
  '/settings',
  '/billing',
  '/profile',
  '/admin',
  '/onboarding',
  '/community',
  '/developer',
  '/organizations',
];

function getTokenFromCookie(request: NextRequest): string | null {
  return request.cookies.get('synapse_token')?.value ?? null;
}

async function verifyJwt(
  token: string,
): Promise<{ onboardingComplete?: boolean; role?: string } | null> {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    // Full signature verification — preferred when JWT_SECRET is available
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      return payload as { onboardingComplete?: boolean; role?: string };
    } catch {
      return null; // expired or tampered
    }
  }

  // Fallback: decode without signature check (API enforces real auth on every request)
  // This path is hit when JWT_SECRET is not injected into the web process env.
  try {
    const raw = token.split('.')[1];
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8')) as {
      onboardingComplete?: boolean;
      role?: string;
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
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

  const payload = await verifyJwt(token);

  // Invalid or expired token — force re-auth
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('synapse_token');
    return response;
  }

  // Admin-only routes
  if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!payload.onboardingComplete && pathname !== '/onboarding') {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  if (payload.onboardingComplete && pathname === '/onboarding') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
