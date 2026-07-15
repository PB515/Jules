'use client';

import { EmptyState } from '@/lib/patterns/empty-state';
import { Trophy } from '@/lib/icons';
import type { Tier } from '@/lib/supabase/database.types';

interface Row {
  tier: string;
  student_count: number;
}

const TIER_ORDER: Tier[] = ['ember', 'volt', 'current', 'plasma'];
const TIER_LABEL: Record<Tier, string> = { ember: 'Ember', volt: 'Volt', current: 'Current', plasma: 'Plasma' };
const TIER_COLOR: Record<Tier, string> = {
  ember: 'var(--tier-ember-text)',
  volt: 'var(--tier-volt-text)',
  current: 'var(--tier-current-text)',
  plasma: 'var(--tier-plasma-text)',
};

export function TierDistributionChart({ rows }: { rows: Row[] }) {
  const counts = new Map(rows.map((r) => [r.tier, r.student_count]));
  const total = rows.reduce((sum, r) => sum + r.student_count, 0);

  if (total === 0) {
    return <EmptyState icon={Trophy} title="No students yet" />;
  }

  const max = Math.max(1, ...TIER_ORDER.map((t) => counts.get(t) ?? 0));

  return (
    <div className="flex flex-col gap-2">
      {TIER_ORDER.map((tier) => {
        const count = counts.get(tier) ?? 0;
        return (
          <div key={tier} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-tertiary">{TIER_LABEL[tier]}</span>
            <div className="h-3 flex-1 rounded-full bg-background">
              <div
                className="h-3 rounded-full"
                style={{ width: `${(count / max) * 100}%`, background: TIER_COLOR[tier] }}
              />
            </div>
            <span className="w-8 text-right text-xs text-tertiary">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
