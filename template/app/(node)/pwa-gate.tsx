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
 * later remounts within the same tab session skip the check entirely.
 */
import { useEffect, useState } from 'react';
import { PwaRequired } from '@/lib/components/pwa-required';
import { LaunchSplash } from '@/lib/components/launch-splash';
import { Loader2 } from '@/lib/icons';

type Status = 'checking' | 'standalone' | 'blocked';

const CONFIRMED_KEY = 'synergy_pwa_standalone';

function initialStatus(): Status {
  if (typeof window === 'undefined') return 'checking';
  try {
    return window.sessionStorage.getItem(CONFIRMED_KEY) === '1' ? 'standalone' : 'checking';
  } catch {
    return 'checking';
  }
}

export function PwaGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>(initialStatus);

  useEffect(() => {
    if (status !== 'checking') return;

    const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    // DEV-TESTING-ONLY: mirrors proxy.ts's own dev_mobile_bypass cookie, gated
    // the same way (process.env.NODE_ENV is inlined at build time, so this
    // branch doesn't even exist in a real production bundle). Lets a real
    // browser tab pass Layer 2 (which otherwise requires an actually-installed
    // PWA's standalone display-mode — no real browser tab can satisfy that)
    // purely so this can be verified live during development.
    const devBypass = process.env.NODE_ENV !== 'production' && document.cookie.includes('dev_mobile_bypass=1');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || iosStandalone || devBypass;

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
