'use client';
/**
 * Layer 2 of the mobile-PWA-only gate (see proxy.ts for Layer 1). No server
 * signal reliably says "installed as a PWA" across iOS/Android, so this has
 * to run client-side, checking the standalone display-mode a browser only
 * reports once actually launched from a home-screen icon.
 *
 * Fails closed: the initial render (both server and first client paint,
 * before hydration diverges) shows the blocking screen. Only an effect that
 * runs after mount — client-only, never during SSR — can flip it to real
 * content, so nothing sensitive is ever painted before the check resolves.
 */
import { useEffect, useState } from 'react';
import { PwaRequired } from '@/lib/components/pwa-required';
import { LaunchSplash } from '@/lib/components/launch-splash';

export function PwaGate({ children }: { children: React.ReactNode }) {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot sync from a browser API, same pattern as lib/components/count-up.tsx
    setStandalone(window.matchMedia('(display-mode: standalone)').matches || iosStandalone);
  }, []);

  if (!standalone) return <PwaRequired />;
  return <LaunchSplash>{children}</LaunchSplash>;
}
