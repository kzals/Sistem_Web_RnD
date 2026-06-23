import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, createSessionToken, COOKIE_NAME, AUTH_DISABLED, AUTH_BYPASS_SESSION, type AppRole } from '@/lib/auth';

const AUTH_BYPASS_ENABLED = AUTH_DISABLED;
const AUTH_BYPASS_ROLE: 'rnd' | 'requester' = AUTH_BYPASS_SESSION.role;
const AUTH_BYPASS_DEPT = AUTH_BYPASS_SESSION.dept;

// Route yang tidak perlu login
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/options'];

const RESTRICTED_PREFIXES_BY_ROLE: Record<'rnd' | 'requester', string[]> = {
  rnd: [],
  requester: [
    '/input',
    '/sample-management',
    '/loan-notifications',
    '/sample-return-notifications',
    '/edit',
    '/api/import-excel',
    '/api/loan-notifications',
  ],
};

const DEFAULT_HOME_BY_ROLE: Record<AppRole, string> = {
  root: '/admin/users',
  rnd: '/',
  requester: '/',
};

function startsWithPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function canAccessPath(pathname: string, role: AppRole) {
  if (role === 'root') {
    return true;
  }

  const restricted = RESTRICTED_PREFIXES_BY_ROLE[role] || [];
  return !restricted.some((prefix) => startsWithPath(pathname, prefix));
}

function buildSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  };
}

async function createBypassResponse(request: NextRequest, pathname: string) {
  const bypassToken = await createSessionToken({
    userId: 1,
    dept: AUTH_BYPASS_DEPT,
    role: AUTH_BYPASS_ROLE,
    userKey: AUTH_BYPASS_DEPT,
  });

  const existingCookie = request.headers.get('cookie') || '';
  const nextCookieHeader = existingCookie
    ? `${existingCookie}; ${COOKIE_NAME}=${bypassToken}`
    : `${COOKIE_NAME}=${bypassToken}`;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('cookie', nextCookieHeader);

  if (pathname === '/login') {
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set(COOKIE_NAME, bypassToken, buildSessionCookieOptions());
    return response;
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(COOKIE_NAME, bypassToken, buildSessionCookieOptions());
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicAsset = /\.[a-z0-9]+$/i.test(pathname);

  // Izinkan akses ke path publik dan file statis
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname === '/push-sw.js' ||
    pathname.startsWith('/icons/') ||
    isPublicAsset
  ) {
    return NextResponse.next();
  }

  if (AUTH_BYPASS_ENABLED) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      return createBypassResponse(request, pathname);
    }

    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // Jika user sudah login tapi membuka halaman login, arahkan ke dashboard.
  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL(DEFAULT_HOME_BY_ROLE[session.role], request.url));
  }

  // Saat aplikasi dibuka dari root, user yang belum login diarahkan ke login.
  if (pathname === '/' && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Route publik tetap bisa diakses saat belum login.
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessPath(pathname, session.role)) {
    return NextResponse.redirect(new URL(DEFAULT_HOME_BY_ROLE[session.role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
