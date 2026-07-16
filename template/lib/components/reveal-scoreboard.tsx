'use client';
/**
 * Shared "reveal ranks worst-to-best" list, same technique as the Surge
 * Matrix (app/(node)/surge/[surgeId]/matrix/matrix-client.tsx) so the two
 * don't drift — used for the true Winner Declaration moment (Live Round's
 * `complete` phase, on both the host's shared screen and each team's own
 * device). Rank 1 gets the shared WinnerBurst treatment; everyone else gets
 * the same quiet staggered fade as every other rank.
 */
import { useEffect, useState } from 'react';
import { Crown } from '@/lib/icons';
import { WinnerBurst } from '@/lib/components/winner-burst';

export interface RevealRow {
  key: string;
  label: string;
  amount: number;
  rank: number;
  highlight?: boolean;
}

export function RevealScoreboard({ rows, scale = 'full' }: { rows: RevealRow[]; scale?: 'full' | 'compact' }) {
  const sorted = [...rows].sort((a, b) => a.rank - b.rank);
  const reversed = [...sorted].reverse(); // reveal worst rank first, #1 last
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || rows.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot sync, same pattern as matrix-client.tsx
      setVisibleCount(rows.length);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= reversed.length) clearInterval(interval);
    }, 370);
    return () => clearInterval(interval);
    // Depends on rows.length (not just []) — a cold page load into the
    // `complete` phase mounts this with rows still empty (the parent's own
    // async scoreboard fetch hasn't resolved yet); without this dependency
    // the animation locks in visibleCount=0 forever once that fetch does
    // resolve and rows becomes non-empty, same cold-load gap class as
    // decision 26. Scoped to .length, not the array/reversed identity, so
    // it doesn't restart on every unrelated parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  const visibleReversed = reversed.slice(0, visibleCount);
  const visibleSorted = [...visibleReversed].reverse();

  return (
    <ul className="flex flex-col gap-2">
      {visibleSorted.map((row) => {
        const rowContent = (
          <div
            className="flex items-center justify-between rounded-[var(--radius)] border px-4 py-3"
            style={
              row.highlight
                ? { borderColor: 'var(--gold)', background: 'var(--tier-volt-bg)' }
                : { borderColor: 'var(--border)', background: 'var(--card)' }
            }
          >
            <span className="flex items-center gap-2 text-sm">
              {row.rank === 1 ? <Crown className="size-4 text-gold" aria-hidden /> : <span className="w-4 text-tertiary">{row.rank}</span>}
              {row.label}
            </span>
            <span className="text-sm text-gold">{row.amount} J</span>
          </div>
        );
        return row.rank === 1 ? (
          <li key={row.key}>
            <WinnerBurst scale={scale}>{rowContent}</WinnerBurst>
          </li>
        ) : (
          <li key={row.key} className="opacity-0" style={{ animation: 'reveal-row-in 0.4s ease-out forwards' }}>
            {rowContent}
          </li>
        );
      })}
      <style jsx global>{`
        @keyframes reveal-row-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*='reveal-row-in'] { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </ul>
  );
}
