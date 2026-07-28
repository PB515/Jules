'use client';
/**
 * A once-a-day "app boot" moment for the staff PWA — the executive-palette
 * counterpart to the student LaunchSplash. Now mirrors the same clip -> moto
 * sequence (previously admin was deliberately lighter, clip-only, but the
 * user asked for a consistent "Progress, together." beat in both PWAs).
 * Admin is used by professors/committee members checking things quickly,
 * often standing in a hallway right after an event, so it stays short
 * (~4s total) and once per calendar day, same localStorage-gated pattern
 * as launch-splash.tsx.
 *
 * Purely cosmetic, fails OPEN like its student counterpart: children always
 * render immediately, the overlay is only ever added on top by a client
 * effect, and it's skipped outright under prefers-reduced-motion.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { site } from '@/lib/site';
import { HeroClip } from '@/lib/components/hero-clip';

const STORAGE_KEY = 'jules_admin_splash_date';
const CLIP_FRAMES = 66;
const CLIP_MS = (CLIP_FRAMES / 25) * 1000;
type Phase = 'clip' | 'moto' | 'done';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminSplash({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('done');
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seenToday = window.localStorage.getItem(STORAGE_KEY) === todayKey();
    if (reduced || seenToday) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot kickoff, same pattern as launch-splash.tsx
    setPhase('clip');

    const timers = [
      setTimeout(() => setPhase('moto'), CLIP_MS),
      setTimeout(() => setExiting(true), CLIP_MS + 900),
      setTimeout(() => {
        window.localStorage.setItem(STORAGE_KEY, todayKey());
        setPhase('done');
      }, CLIP_MS + 1200),
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
              {phase === 'clip' ? (
                <motion.div key="admin-clip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                  <HeroClip src="/videos/splash-admin.webp" frames={CLIP_FRAMES} />
                </motion.div>
              ) : null}
              {phase === 'moto' ? (
                <motion.p
                  key="moto"
                  className="max-w-sm px-8 text-center text-xl leading-snug font-medium text-gold"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45 }}
                >
                  {site.tagline}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
