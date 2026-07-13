'use client';
/**
 * The Profile avatar scene (Stage 1 of the solarpunk-avatar plan).
 *
 * DEMO-CONCEPT PLACEHOLDER (temporary): the real R3F 3D canvas has an
 * unresolved rendering gap in some browser environments (see CLAUDE.md
 * Known open items) — too risky to trust live in a demo. This swaps the
 * <Canvas>/icosahedron for a plain CSS/SVG shape (a rotating diamond,
 * tier-colored) that demonstrates the same concept — a character stand-in
 * that visibly reflects tier — with zero WebGL risk. `three`/
 * `@react-three/fiber`/`@react-three/drei` stay installed; Stage 2 (the
 * real sourced model) still replaces this same component later.
 *
 * prefers-reduced-motion still skips to the static fallback image, same
 * fail-open posture as launch-splash.tsx.
 */
import { useEffect, useState } from 'react';
import { AvatarBackdrop } from './avatar-backdrop';
import type { Tier } from '@/lib/supabase/database.types';

const TIER_COLOR: Record<Tier, string> = {
  ember: '#d99a4e',
  volt: '#FFC72C',
  current: '#FFC72C',
  plasma: '#FFC72C',
};

export function AvatarScene({ tier }: { tier: Tier }) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot sync from a browser API, same pattern as hero-atom.tsx/count-up.tsx
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  if (reducedMotion) {
    return (
      <div className="relative aspect-[3/3.6] w-full overflow-hidden rounded-[var(--radius)]">
        <AvatarBackdrop />
        {/* eslint-disable-next-line @next/next/no-img-element -- static fallback still, not an optimizable content image */}
        <img
          src={`/images/avatar/fallback-${tier}.png`}
          alt="Your character"
          className="relative h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="relative flex aspect-[3/3.6] w-full items-center justify-center overflow-hidden rounded-[var(--radius)]">
      <AvatarBackdrop />
      <div
        className="relative size-28 rounded-2xl"
        style={{
          background: TIER_COLOR[tier],
          boxShadow: `0 0 40px ${TIER_COLOR[tier]}66`,
          animation: 'avatar-concept-spin 6s linear infinite, avatar-concept-pulse 2.4s ease-in-out infinite',
        }}
      />
      <style jsx global>{`
        @keyframes avatar-concept-spin {
          from { transform: rotate(45deg); }
          to { transform: rotate(405deg); }
        }
        @keyframes avatar-concept-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.72; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*='avatar-concept-spin'] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
