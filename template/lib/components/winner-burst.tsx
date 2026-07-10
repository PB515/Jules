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
 */
import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { playSound } from '@/lib/jules/sound';
import { vibrate } from '@/lib/jules/haptics';

const CONFETTI_COLORS = ['#FFC72C', '#E34234', '#ffffff'];

export function WinnerBurst({
  children,
  scale = 'full',
}: {
  children: React.ReactNode;
  scale?: 'full' | 'compact';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    playSound('winner');
    vibrate([50, 40, 50, 40, 120]);
    if (reducedMotion) return;

    const rect = ref.current?.getBoundingClientRect();
    const origin = rect
      ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight }
      : { x: 0.5, y: 0.4 };

    if (scale === 'full') {
      confetti({ particleCount: 140, spread: 100, origin, colors: CONFETTI_COLORS });
      confetti({ particleCount: 80, spread: 120, origin: { x: 0.15, y: 0.3 }, colors: CONFETTI_COLORS });
      confetti({ particleCount: 80, spread: 120, origin: { x: 0.85, y: 0.3 }, colors: CONFETTI_COLORS });
    } else {
      confetti({ particleCount: 70, spread: 75, origin, colors: CONFETTI_COLORS });
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
