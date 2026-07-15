import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/admin/login',
  '/events',
  '/get-app',
  '/event-reports',
  '/api/event-reports',
  '/gallery',
  '/mobile-required',
];

// Student "Node" routes — per the professor's requirement, these only ever
// run as an installed PWA on a phone (see lib/components/pwa-required.tsx
// for the full rationale). This is Layer 1 (server-side, catches "opened on
// a laptop" before any bundle loads); Layer 2 lives in app/(node)/layout.tsx
// and additionally requires standalone display-mode, which only JS can see.
const NODE_PATHS = ['/dashboard', '/scan', '/live', '/surge', '/catalyst', '/profile'];

function isPublic(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname.startsWith('/api/health')) return true;
  if (pathname.startsWith('/icons/')) return true;
  if (pathname === '/manifest.webmanifest' || pathname === '/sw.js') return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isNodePath(pathname: string): boolean {
  return NODE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function looksLikeMobile(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod/i.test(userAgent);
}

// DEV-TESTING-ONLY escape hatch for both gate layers (this one, and Layer 2's
// display-mode check in app/(node)/pwa-gate.tsx) — lets a real browser tab
// exercise Node routes without an actual installed PWA/phone, purely so this
// can be verified live during development. Double-gated on purpose: even if
// someone typed the query param on a real deployment, `NODE_ENV` is always
// 'production' for any real `next build`/`next start`, which Vercel always
// runs — so this can never be reachable outside `next dev`, regardless of any
// other env misconfiguration. Never reference this from student-facing UI.
const DEV_BYPASS_COOKIE = 'dev_mobile_bypass';
function isDevMobileBypass(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return request.nextUrl.searchParams.get('devMobileBypass') === '1' || request.cookies.get(DEV_BYPASS_COOKIE)?.value === '1';
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const devBypass = isDevMobileBypass(request);

  // A soft gate, not a security boundary (same posture as the QR geofence
  // check) — a user-agent is self-reported and easy to fake from dev tools.
  // It stops the ordinary case (a student opens the link on a laptop) cold.
  if (isNodePath(pathname) && !looksLikeMobile(request.headers.get('user-agent') ?? '') && !devBypass) {
    const url = request.nextUrl.clone();
    url.pathname = '/mobile-required';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Refresh the session first — no code between createServerClient and
  // getUser (lib/supabase/middleware.ts), so route-protection logic below
  // reads a trustworthy `user`.
  const { supabaseResponse, user } = await updateSession(request);

  // Once the bypass is triggered via the query param, remember it in a
  // (non-HttpOnly, so Layer 2's client-side check can read it too) cookie so
  // it survives normal in-app navigation without repeating the param on every
  // link — dev-only per isDevMobileBypass's own NODE_ENV gate above.
  if (devBypass && request.nextUrl.searchParams.get('devMobileBypass') === '1') {
    supabaseResponse.cookies.set(DEV_BYPASS_COOKIE, '1', { path: '/', httpOnly: false, sameSite: 'lax' });
  }

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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav)$).*)',
  ],
};
