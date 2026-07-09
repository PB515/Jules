import type { Tier } from '@/lib/supabase/database.types';
import { tierLabel } from '@/lib/jules/tiers';
import { Flame, Zap, Award, Sparkles } from '@/lib/icons';

const TIER_ICON = { ember: Flame, volt: Zap, current: Award, plasma: Sparkles } as const;

export function TierBadge({ tier, className = '' }: { tier: Tier; className?: string }) {
  const Icon = TIER_ICON[tier];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
        tier === 'plasma' ? 'tier-plasma-pulse' : ''
      } ${className}`}
      style={{
        color: `var(--tier-${tier}-text)`,
        borderColor: `var(--tier-${tier}-border)`,
        background: `var(--tier-${tier}-bg)`,
      }}
    >
      <Icon className="size-3.5" aria-hidden />
      {tierLabel(tier)}
    </span>
  );
}
