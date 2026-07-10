'use client';
/**
 * The one "this is the moment" beat, reused everywhere a #1 result appears
 * (Surge Matrix, Live Round host scoreboard, Live Round team scoreboard) so
 * it's tuned once instead of three times. Fires confetti + sound + a
 * distinct vibration pattern on mount, and gives its children a bigger
 * spring pop than the plain reveal rows around them.
 *
 * `scale="full"` is for the shared/projector screen (host, big Matrix
 * reveal) — three confetti bursts across the width. `scale="compact"` is
 * for a single phone screen — one smaller burst centered on the card.
 *
 * `colors` also reused by the tier-up celebration (`tier-up-celebration.tsx`)
 * with that tier's own CSS variables, so the confetti always matches
 * whatever it's celebrating instead of always being gold/kumkum.
 */
import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { playSound, type SoundName } from '@/lib/jules/sound';
import { vibrate } from '@/lib/jules/haptics';

const DEFAULT_COLOR_VARS = ['--gold', '--accent'];
const DEFAULT_VIBRATION = [50, 40, 50, 40, 120];

/** Reads real token values off :root instead of hardcoding their hex, so this never drifts from globals.css. */
function resolveColors(vars: string[]): string[] {
  const root = getComputedStyle(document.documentElement);
  const resolved = vars.map((v) => root.getPropertyValue(v).trim()).filter(Boolean);
  return resolved.length ? [...resolved, '#ffffff'] : ['#ffffff'];
}

export function WinnerBurst({
  children,
  scale = 'full',
  colors,
  sound = 'winner',
  vibration = DEFAULT_VIBRATION,
}: {
  children: React.ReactNode;
  scale?: 'full' | 'compact';
  /** CSS custom-property names (e.g. ['--tier-plasma-text', '--tier-plasma-border']) to confetti with. Defaults to gold/kumkum. */
  colors?: string[];
  sound?: SoundName;
  vibration?: number | number[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    playSound(sound);
    vibrate(vibration);
    if (reducedMotion) return;

    const confettiColors = resolveColors(colors ?? DEFAULT_COLOR_VARS);
    const rect = ref.current?.getBoundingClientRect();
    const origin = rect
      ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight }
      : { x: 0.5, y: 0.4 };

    if (scale === 'full') {
      confetti({ particleCount: 140, spread: 100, origin, colors: confettiColors });
      confetti({ particleCount: 80, spread: 120, origin: { x: 0.15, y: 0.3 }, colors: confettiColors });
      confetti({ particleCount: 80, spread: 120, origin: { x: 0.85, y: 0.3 }, colors: confettiColors });
    } else {
      confetti({ particleCount: 70, spread: 75, origin, colors: confettiColors });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once on the mount that reveals the winner, not on every re-render
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={reducedMotion ? false : { scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 12 }}
    >
      {children}
    </motion.div>
  );
}
