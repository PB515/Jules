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
import { HeroClip } from '@/lib/components/hero-clip';

const STORAGE_KEY = 'jules_splash_date';
// Real generated clip (trimmed to its first 100 frames/4.0s — the source
// file ran 215 frames/8.6s, but everything past frame ~100 was just a
// static hold + fade of the same already-formed logo, confirmed by sampling
// frames directly). It replaces the old static-icon 'jolt'/'return' phases
// entirely, since the clip itself already covers that exact motion.
const CLIP_FRAMES = 100;
const CLIP_MS = (CLIP_FRAMES / 25) * 1000;
type Phase = 'clip' | 'moto' | 'done';

// The Vishwambhari Stuti, verbatim as supplied — not translated/paraphrased.
// Rotates with the English tagline so the moto beat isn't identical every
// day (project-spec-v4-addendum.md's "deeper Shakti integration" idea).
const STUTI_VERSE = `ખાલી ન કાંઇ સ્થળ છે વિણ આપ ધારો,
બ્રહ્માંડમાં અણું અણું મહીં વાસ તારો,
શક્તિ ન માપ ગણવા અગણિત માપો,
મામ્ પાહિ ઓ ભગવતી ! ભવ દુઃખ કાપો`;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function LaunchSplash({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('done');
  const [exiting, setExiting] = useState(false);
  const [motoText, setMotoText] = useState<string>(site.tagline);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seenToday = window.localStorage.getItem(STORAGE_KEY) === todayKey();
    if (reduced || seenToday) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot kickoff of the sequence, same pattern as lib/components/count-up.tsx
    setMotoText(new Date().getDate() % 2 === 0 ? STUTI_VERSE : site.tagline);
    setPhase('clip');
    vibrate([40, 30, 60]);

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
                <motion.div key="logo-clip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                  <HeroClip src="/videos/splash-daily.webp" frames={100} />
                </motion.div>
              ) : null}
              {phase === 'moto' ? (
                <motion.p
                  key="moto"
                  className="max-w-sm px-8 text-center text-xl leading-snug font-medium whitespace-pre-line text-gold"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45 }}
                >
                  {motoText}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
