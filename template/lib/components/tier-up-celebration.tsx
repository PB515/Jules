'use client';
/**
 * Finishes a spec'd feature that was never built (project-spec.md §6:
 * "Crossing a tier boundary fires a bump animation and a toast"). Since
 * tier_for_joules() only ever returns the CURRENT tier (no before/after
 * pair), the only place to detect a change is client-side: remember the
 * last tier this browser saw for this student, compare on the next
 * dashboard visit. Never celebrates the first-ever visit (nothing to
 * compare against) or a downgrade (only a manual admin adjustment could
 * cause one).
 */
import { useEffect, useState } from 'react';
import { TierBadge } from '@/lib/components/tier-badge';
import { WinnerBurst } from '@/lib/components/winner-burst';
import { TIERS, tierLabel } from '@/lib/jules/tiers';
import type { Tier } from '@/lib/supabase/database.types';

const STORAGE_KEY = 'jules_last_tier';

function tierRank(tier: Tier): number {
  return TIERS.findIndex((t) => t.key === tier);
}

export function TierUpCelebration({ tier }: { tier: Tier }) {
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    const previous = window.localStorage.getItem(STORAGE_KEY) as Tier | null;
    window.localStorage.setItem(STORAGE_KEY, tier);

    const previousRank = previous ? tierRank(previous) : -1;
    if (previousRank !== -1 && tierRank(tier) > previousRank) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot kickoff, same pattern as launch-splash.tsx
      setCelebrating(true);
      // Matches the real tier-up.mp3's own length (~5.5s) — was 3200ms for
      // the original short placeholder tone.
      const t = setTimeout(() => setCelebrating(false), 5600);
      return () => clearTimeout(t);
    }
  }, [tier]);

  if (!celebrating) return null;

  return (
    <div className="fixed inset-x-0 top-6 z-40 flex justify-center px-6">
      <WinnerBurst
        scale="compact"
        colors={[`--tier-${tier}-text`, `--tier-${tier}-border`]}
        sound="tier-up"
        vibration={[60, 40, 60]}
      >
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-4 text-center shadow-lg">
          <p className="text-xs uppercase tracking-wide text-muted">You reached</p>
          <TierBadge tier={tier} />
          <p className="text-sm text-muted">{tierLabel(tier)} unlocked</p>
        </div>
      </WinnerBurst>
    </div>
  );
}
