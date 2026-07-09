'use client';
/**
 * Surge Matrix reveal (spec §6). Ranks animate in 10th → 1st, staggered
 * ~350-380ms apart (spec §3 motion). The personal result card is the V4 fix:
 * everyone gets a takeaway, not just the top 10.
 */
import { useEffect, useState } from 'react';
import { TierBadge } from '@/lib/components/tier-badge';
import type { Tier } from '@/lib/supabase/database.types';

interface Row {
  student_id: string;
  name: string;
  total_amount: number;
  rank: number;
}

export function MatrixClient({ top10, mine, myTier }: { top10: Row[]; mine: Row | null; myTier: Tier }) {
  const reversed = [...top10].reverse(); // reveal 10th first, 1st last
  const [visibleCount, setVisibleCount] = useState(0);
  const [showPersonal, setShowPersonal] = useState(false);

  useEffect(() => {
    // Reads a media-query "external system" on mount to decide the reveal
    // sequence — legitimate effect sync, not something render can compute.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || top10.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisibleCount(top10.length);
      setShowPersonal(true);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= reversed.length) {
        clearInterval(interval);
        setTimeout(() => setShowPersonal(true), 400);
      }
    }, 370);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleReversed = reversed.slice(0, visibleCount);
  const visibleTop10 = [...visibleReversed].reverse();

  return (
    <div className="flex flex-col gap-6">
      {top10.length === 0 ? (
        <p className="text-sm text-muted">No answers were recorded for this Surge yet.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {visibleTop10.map((row) => (
            <li
              key={row.student_id}
              className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-card px-4 py-3 opacity-0"
              style={{ animation: 'matrix-row-in 0.4s ease-out forwards' }}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-sm font-medium text-tertiary">#{row.rank}</span>
                <span className="text-sm">{row.name}</span>
              </div>
              <span className="text-sm font-medium text-gold">{row.total_amount} J</span>
            </li>
          ))}
        </ol>
      )}

      {showPersonal && mine ? (
        <div
          className="rounded-2xl border border-border bg-card p-6 text-center opacity-0"
          style={{ animation: 'matrix-row-in 0.5s ease-out forwards' }}
        >
          <p className="text-xs uppercase tracking-wide text-muted">Your result</p>
          <p className="mt-1 text-3xl font-medium text-gold">#{mine.rank}</p>
          <p className="mt-1 text-sm text-muted">out of everyone who joined</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-sm">{mine.total_amount} J earned</span>
            <TierBadge tier={myTier} />
          </div>
        </div>
      ) : showPersonal ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center opacity-0" style={{ animation: 'matrix-row-in 0.5s ease-out forwards' }}>
          <p className="text-sm text-muted">You didn&apos;t answer any questions in this Surge.</p>
          <div className="mt-3 flex justify-center">
            <TierBadge tier={myTier} />
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes matrix-row-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*='matrix-row-in'] { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
}
