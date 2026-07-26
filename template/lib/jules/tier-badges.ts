import type { Tier } from '@/lib/supabase/database.types';

/**
 * ★ TEMP — real generated tier badge art (frontend overhaul, decision:
 * "Adani brand system + real generated assets"), used for the one-per-tier
 * "hero moment" display (Dashboard/Profile), never the compact inline pill
 * (`TierBadge` in tier-badge.tsx, still used everywhere else — leaderboard
 * rows, the Vault, etc.). Flagged temp because the Volt art in particular
 * reads as generic "electricity" clip art rather than a bespoke tier
 * emblem — the user confirmed shipping these now and swapping later once
 * better art exists, same "placeholder, not real" convention as decisions
 * 9/10. Rendered inside a `bg-card` (white) chip everywhere it's used,
 * since these JPEGs have an opaque white background, not transparency,
 * and `--card` is already pure white — no image reprocessing needed.
 */
const TIER_BADGE_IMAGE: Record<Tier, string> = {
  ember: '/tiers/ember.jpg',
  volt: '/tiers/volt.jpg',
  current: '/tiers/current.jpg',
  plasma: '/tiers/plasma.jpg',
};

export function tierBadgeImage(tier: Tier): string {
  return TIER_BADGE_IMAGE[tier];
}
