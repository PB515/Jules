'use client';
/**
 * First-time-ever tour for a new student's first Dashboard visit, distinct
 * from launch-splash.tsx's once-PER-DAY boot moment (this is once-per-account,
 * gated by a separate localStorage key so the two never interact). Same
 * fail-open posture as the splash: purely cosmetic, never a security gate,
 * so a slow/blocked JS environment just skips the tour rather than blocking
 * the real dashboard underneath.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Zap, ScanLine, MonitorPlay, Trophy, X } from '@/lib/icons';

const STORAGE_KEY = 'jules_onboarding_seen';

const SLIDES = [
  {
    icon: Zap,
    title: 'Earn Joules',
    body: 'Every event you check into and every quiz you play earns you Joules, your season score.',
  },
  {
    icon: ScanLine,
    title: 'Scan to check in',
    body: 'At any event, scan the QR code on screen to confirm your attendance and collect Joules.',
  },
  {
    icon: MonitorPlay,
    title: 'Play Surges and Live Rounds',
    body: 'Quizzes run two ways: Surge Mode at your own pace, or Live Round together with everyone at once.',
  },
  {
    icon: Trophy,
    title: 'Climb the Leaderboard',
    body: 'Your season Joules place you on the Leaderboard and move you up through Ember, Volt, Current, and Plasma tiers.',
  },
] as const;

export function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = window.localStorage.getItem(STORAGE_KEY) === 'true';
    if (!seen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot check of a browser API, same pattern as launch-splash.tsx
      setVisible(true);
    }
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  }

  if (!visible) return null;

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-background/98 px-8 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Skip tour"
          className="absolute top-6 right-6 flex size-9 items-center justify-center rounded-[var(--radius)] text-tertiary"
        >
          <X className="size-5" aria-hidden />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="flex max-w-xs flex-col items-center gap-4 text-center"
          >
            <div className="flex size-16 items-center justify-center rounded-full bg-card">
              <slide.icon className="size-7 text-gold" aria-hidden />
            </div>
            <h2 className="text-lg font-medium">{slide.title}</h2>
            <p className="text-sm leading-relaxed text-muted">{slide.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`size-1.5 rounded-full ${i === step ? 'bg-gold' : 'bg-border'}`}
              aria-hidden
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}
          className="w-full max-w-xs rounded-[var(--radius)] bg-gold py-3 text-sm font-medium text-gold-foreground"
        >
          {isLast ? 'Get started' : 'Next'}
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
