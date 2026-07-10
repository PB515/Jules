'use client';
/**
 * The once-a-day "app boot" moment for students opening the installed PWA:
 * logo jolts in -> the club's moto appears -> logo returns -> the dashboard
 * underneath is revealed. Purely cosmetic (never a security gate), so it
 * fails OPEN: children always render immediately, and the overlay is only
 * ever added on top by a client effect, never something that can leave a
 * blank screen if JS is slow, disabled, or the check hasn't resolved yet.
 *
 * Plays once per calendar day (localStorage-gated) and is skipped outright
 * under prefers-reduced-motion.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { site } from '@/lib/site';
import { vibrate } from '@/lib/jules/haptics';

const STORAGE_KEY = 'jules_splash_date';
type Phase = 'jolt' | 'moto' | 'return' | 'done';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function LaunchSplash({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('done');
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seenToday = window.localStorage.getItem(STORAGE_KEY) === todayKey();
    if (reduced || seenToday) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot kickoff of the sequence, same pattern as lib/components/count-up.tsx
    setPhase('jolt');
    vibrate([40, 30, 60]);

    const timers = [
      setTimeout(() => setPhase('moto'), 650),
      setTimeout(() => setPhase('return'), 1550),
      setTimeout(() => setExiting(true), 1950),
      setTimeout(() => {
        window.localStorage.setItem(STORAGE_KEY, todayKey());
        setPhase('done');
      }, 2250),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <>
      {children}
      <AnimatePresence>
        {phase !== 'done' ? (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background"
            initial={{ opacity: 1 }}
            animate={{ opacity: exiting ? 0 : 1 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence mode="wait">
              {phase === 'jolt' ? (
                <motion.img
                  key="logo-jolt"
                  src="/icons/icon.svg"
                  alt={site.name}
                  className="size-24"
                  initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 11 }}
                />
              ) : null}
              {phase === 'moto' ? (
                <motion.p
                  key="moto"
                  className="max-w-xs px-8 text-center text-xl font-medium text-gold"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45 }}
                >
                  {site.tagline}
                </motion.p>
              ) : null}
              {phase === 'return' ? (
                <motion.img
                  key="logo-return"
                  src="/icons/icon.svg"
                  alt={site.name}
                  className="size-20"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.35 }}
                />
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
