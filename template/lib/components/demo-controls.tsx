'use client';
/**
 * DEMO-ONLY scaffold, temporary for a live professor demo — not a real
 * feature. Wraps the season-Joules hero card with local override state so
 * "Simulate" buttons can bump Season/Lifetime Joules and trigger the real
 * tier-up celebration on demand, without a real QR scan or a second device.
 * Strip this back out to the plain server-rendered season card once the
 * demo is done.
 */
import { useState } from 'react';
import { CountUp } from '@/lib/components/count-up';
import { TierBadge } from '@/lib/components/tier-badge';
import { TierUpCelebration } from '@/lib/components/tier-up-celebration';
import { tierForJoules, tierProgress, nextTierAt } from '@/lib/jules/tiers';

export function DemoControls({
  initialSeasonJoules,
  initialLifetimeJoules,
  daysLeft,
}: {
  initialSeasonJoules: number;
  initialLifetimeJoules: number;
  daysLeft: number | null;
}) {
  const [seasonJoules, setSeasonJoules] = useState(initialSeasonJoules);
  const [lifetimeJoules, setLifetimeJoules] = useState(initialLifetimeJoules);

  const tier = tierForJoules(seasonJoules);
  const progress = tierProgress(seasonJoules);
  const nextAt = nextTierAt(seasonJoules);

  function simulate(amount: number) {
    setSeasonJoules((v) => v + amount);
    setLifetimeJoules((v) => v + amount);
  }

  return (
    <>
      <TierUpCelebration tier={tier} />

      <section className="rounded-2xl border border-border bg-card p-6 ambient-drift">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Season Joules</p>
            <CountUp value={seasonJoules} className="text-4xl font-medium text-gold" />
          </div>
          <TierBadge tier={tier} />
        </div>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-gold transition-all duration-700 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-tertiary">
          {nextAt ? `${nextAt - seasonJoules} J to next tier` : 'Top tier, uncapped'}
        </p>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">Lifetime Joules</span>
          <CountUp value={lifetimeJoules} className="font-medium" />
        </div>
        {daysLeft !== null ? <p className="mt-1 text-xs text-tertiary">Season ends in {daysLeft} days</p> : null}
      </section>

      <section className="rounded-[var(--radius)] border border-dashed border-accent/50 bg-card p-4">
        <p className="mb-2.5 flex items-center gap-2 text-xs font-medium text-accent">
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] uppercase tracking-wide">Demo</span>
          Simulate an event scan
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => simulate(10)}
            className="flex-1 rounded-[var(--radius)] border border-border bg-background py-2 text-xs font-medium text-foreground"
          >
            +10 J
          </button>
          <button
            onClick={() => simulate(25)}
            className="flex-1 rounded-[var(--radius)] border border-border bg-background py-2 text-xs font-medium text-foreground"
          >
            +25 J
          </button>
          <button
            onClick={() => simulate(50)}
            className="flex-1 rounded-[var(--radius)] border border-border bg-background py-2 text-xs font-medium text-foreground"
          >
            +50 J
          </button>
        </div>
      </section>
    </>
  );
}
