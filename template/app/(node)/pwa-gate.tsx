'use client';
/**
 * Layer 2 of the mobile-PWA-only gate (see proxy.ts for Layer 1). No server
 * signal reliably says "installed as a PWA" across iOS/Android, so this has
 * to run client-side, checking the standalone display-mode a browser only
 * reports once actually launched from a home-screen icon.
 *
 * Fails closed: the initial render (both server and first client paint,
 * before hydration diverges) shows a neutral loading screen, never the
 * blocking "get the app" screen — that copy is only correct for a genuinely
 * non-standalone visitor, and briefly flashing it at every mount (some
 * Android WebViews reload the document on in-app navigation without
 * restarting the whole app, which remounts this component without a real
 * cold start) reads as "you need to install this" to someone who already
 * has. Once confirmed standalone, that fact is cached in sessionStorage so
 * later remounts within the same tab session resolve on the very next
 * effect tick — but the sessionStorage read itself only ever happens
 * inside the effect, never in the useState initializer. Reading it
 * synchronously during render (an earlier version of this file did) made
 * the client's very first hydration-time render diverge from the
 * server's — the server always renders 'checking' (no sessionStorage
 * access), but a client with an already-cached '1' from an earlier
 * navigation this same tab session would render 'standalone' immediately,
 * a real hydration mismatch on every navigation after the first. Always
 * starting at 'checking' guarantees hydration always matches; the cached
 * value is folded into the same effect that does the real check, so
 * there's still only one setStatus call, one render past 'checking'.
 */
import { useEffect, useState } from 'react';
import { PwaRequired } from '@/lib/components/pwa-required';
import { LaunchSplash } from '@/lib/components/launch-splash';
import { Loader2 } from '@/lib/icons';

type Status = 'checking' | 'standalone' | 'blocked';

const CONFIRMED_KEY = 'synergy_pwa_standalone';

export function PwaGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    if (status !== 'checking') return;

    let cachedStandalone = false;
    try {
      cachedStandalone = window.sessionStorage.getItem(CONFIRMED_KEY) === '1';
    } catch {
      // sessionStorage unavailable (private mode etc.) — falls through to the real check below
    }

    const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    // DEV-TESTING-ONLY: mirrors proxy.ts's own dev_mobile_bypass cookie, gated
    // the same way (process.env.NODE_ENV is inlined at build time, so this
    // branch doesn't even exist in a real production bundle). Lets a real
    // browser tab pass Layer 2 (which otherwise requires an actually-installed
    // PWA's standalone display-mode — no real browser tab can satisfy that)
    // purely so this can be verified live during development.
    const devBypass = process.env.NODE_ENV !== 'production' && document.cookie.includes('dev_mobile_bypass=1');
    const isStandalone = cachedStandalone || window.matchMedia('(display-mode: standalone)').matches || iosStandalone || devBypass;

    if (isStandalone) {
      try {
        window.sessionStorage.setItem(CONFIRMED_KEY, '1');
      } catch {
        // sessionStorage unavailable (private mode etc.) — just re-checks next mount
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot sync from a browser API, same pattern as lib/components/count-up.tsx
    setStatus(isStandalone ? 'standalone' : 'blocked');
  }, [status]);

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-tertiary" aria-hidden />
      </div>
    );
  }
  if (status === 'blocked') return <PwaRequired />;
  return <LaunchSplash>{children}</LaunchSplash>;
}
