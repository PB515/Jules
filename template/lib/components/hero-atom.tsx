'use client';
/**
 * The homepage hero's interactive centerpiece — the same atom-orbit + spark
 * mark as public/icons/icon.svg (kept geometrically identical on purpose,
 * so it reads as the same brand mark, just bigger and alive), with a slow
 * ambient auto-rotation (pure CSS) and a subtle pointer/touch parallax
 * (plain React state + a CSS transition, not motion's SVG transform
 * handling, which doesn't apply cleanly to nested SVG <g> elements).
 *
 * A single onPointerMove handler covers both mouse and touch (no iOS
 * device-orientation permission prompt needed for a purely decorative
 * effect). The shape itself always renders in the initial markup — only
 * the parallax is a progressive, JS-only enhancement, and
 * prefers-reduced-motion drops both the rotation and the parallax entirely,
 * checked the same way as lib/components/count-up.tsx and others.
 */
import { useEffect, useRef, useState } from 'react';

export function HeroAtom({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot sync from a browser API, same pattern as count-up.tsx
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    setOffset({ x: relX * 32, y: relY * 32 });
  }

  function handlePointerLeave() {
    setOffset({ x: 0, y: 0 });
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`flex items-center justify-center ${className}`}
    >
      <svg
        viewBox="0 0 512 512"
        aria-hidden
        className={`h-[420px] w-[420px] max-w-full ${reducedMotion ? '' : 'hero-atom-parallax'}`}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <g transform="translate(256 256)">
          <g className={reducedMotion ? '' : 'hero-atom-spin'}>
            <ellipse rx="170" ry="80" fill="none" stroke="var(--gold)" strokeWidth="3" opacity="0.85" transform="rotate(-30)" />
            <ellipse rx="170" ry="80" fill="none" stroke="var(--gold)" strokeWidth="3" opacity="0.85" transform="rotate(30)" />
          </g>
          <path d="M10 -78 L-38 12 H-6 L-22 78 L44 -16 H8 Z" fill="var(--gold)" />
          <circle cx="0" cy="-78" r="9" fill="var(--accent)" />
        </g>
      </svg>
      <style>{`
        .hero-atom-parallax { transition: transform 0.3s ease-out; }
        .hero-atom-spin {
          animation: hero-atom-spin 48s linear infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes hero-atom-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
