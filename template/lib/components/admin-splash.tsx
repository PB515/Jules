'use client';
/**
 * A once-a-day "app boot" moment for the staff PWA — the executive-palette
 * counterpart to the student LaunchSplash, kept deliberately lighter: no
 * moto-text beat, just the clip then straight to the real dashboard. Admin
 * is used by professors/committee members checking things quickly, often
 * standing in a hallway right after an event — this needs to stay fast, not
 * become a landing-page moment (design-brief.md's own stated direction for
 * admin screens specifically), so it's short (~2.9s total) and once per
 * calendar day, same localStorage-gated pattern as launch-splash.tsx.
 *
 * Purely cosmetic, fails OPEN like its student counterpart: children always
 * render immediately, the overlay is only ever added on top by a client
 * effect, and it's skipped outright under prefers-reduced-motion.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HeroClip } from '@/lib/components/hero-clip';

const STORAGE_KEY = 'jules_admin_splash_date';
const CLIP_FRAMES = 66;
const CLIP_MS = (CLIP_FRAMES / 25) * 1000;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminSplash({ children }: { children: React.ReactNode }) {
  const [showing, setShowing] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seenToday = window.localStorage.getItem(STORAGE_KEY) === todayKey();
    if (reduced || seenToday) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot kickoff, same pattern as launch-splash.tsx
    setShowing(true);

    const timers = [
      setTimeout(() => setExiting(true), CLIP_MS),
      setTimeout(() => {
        window.localStorage.setItem(STORAGE_KEY, todayKey());
        setShowing(false);
      }, CLIP_MS + 300),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <>
      {children}
      <AnimatePresence>
        {showing ? (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background"
            initial={{ opacity: 1 }}
            animate={{ opacity: exiting ? 0 : 1 }}
            transition={{ duration: 0.3 }}
          >
            <HeroClip src="/videos/splash-admin.webp" frames={CLIP_FRAMES} className="size-24 object-contain" />
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Reactor Command Center</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
