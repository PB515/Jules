import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/admin/login',
];

function isPublic(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname.startsWith('/api/health')) return true;
  if (pathname.startsWith('/icons/')) return true;
  if (pathname === '/manifest.webmanifest' || pathname === '/sw.js') return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  // Refresh the session first — no code between createServerClient and
  // getUser (lib/supabase/middleware.ts), so route-protection logic below
  // reads a trustworthy `user`.
  const { supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return supabaseResponse;

  if (!user) {
    const isAdminArea = pathname.startsWith('/admin');
    const url = request.nextUrl.clone();
    const next = `${pathname}${url.search}`;
    url.pathname = isAdminArea ? '/admin/login' : '/login';
    url.search = '';
    if (!isAdminArea && next !== '/') url.searchParams.set('next', next);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and Next internals, so the
     * session cookie stays fresh across the whole app (rail: don't run logic
     * between createServerClient and getUser, satisfied inside updateSession).
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
