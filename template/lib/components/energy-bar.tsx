'use client';
/**
 * Live Surge Mode's per-question timer (spec §6): a bar that decays over
 * time_limit_seconds, gold → amber → vermilion, flashing/jittering under 20%
 * remaining. `running` lets the parent freeze it the instant an answer locks.
 */
import { useEffect, useRef, useState } from 'react';

export function EnergyBar({
  totalSeconds,
  running,
  onExpire,
}: {
  totalSeconds: number;
  running: boolean;
  onExpire: () => void;
}) {
  // The parent remounts EnergyBar via a `key` per question, so this initial
  // value is always fresh — no reset-on-prop-change effect needed.
  const [remainingMs, setRemainingMs] = useState(totalSeconds * 1000);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    let raf: number;
    const start = performance.now();
    const startRemaining = remainingMs;

    function tick(now: number) {
      const elapsed = now - start;
      const next = Math.max(0, startRemaining - elapsed);
      setRemainingMs(next);
      if (next <= 0) {
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpire();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const pct = Math.max(0, Math.min(1, remainingMs / (totalSeconds * 1000)));
  const low = pct < 0.2;
  const color = pct > 0.5 ? 'var(--gold)' : pct > 0.2 ? 'var(--tier-ember-text)' : 'var(--accent)';

  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-card ${low ? 'energy-jitter' : ''}`}>
      <div
        className="h-full rounded-full transition-[width] duration-100 ease-linear"
        style={{ width: `${pct * 100}%`, background: color }}
      />
      <style jsx>{`
        .energy-jitter {
          animation: energy-flash 0.4s ease-in-out infinite;
        }
        @keyframes energy-flash {
          0%, 100% { opacity: 1; transform: translateX(0); }
          50% { opacity: 0.7; transform: translateX(1px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .energy-jitter { animation: none; }
        }
      `}</style>
    </div>
  );
}
