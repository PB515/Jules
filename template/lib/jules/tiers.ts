/**
 * Tier thresholds — spec §4. Mirrors the SQL tier_for_joules() function
 * (0004_jules_functions.sql) so the client can render a "next threshold"
 * progress bar without a round trip.
 */
import type { Tier } from '@/lib/supabase/database.types';

export const TIERS: { key: Tier; label: string; min: number; max: number | null }[] = [
  { key: 'ember', label: 'Ember', min: 0, max: 299 },
  { key: 'volt', label: 'Volt', min: 300, max: 599 },
  { key: 'current', label: 'Current', min: 600, max: 999 },
  { key: 'plasma', label: 'Plasma', min: 1000, max: null },
];

export function tierForJoules(joules: number): Tier {
  if (joules >= 1000) return 'plasma';
  if (joules >= 600) return 'current';
  if (joules >= 300) return 'volt';
  return 'ember';
}

export function tierLabel(tier: Tier): string {
  return TIERS.find((t) => t.key === tier)?.label ?? tier;
}

/** Progress (0-1) toward the next tier threshold; 1 (full) once in Plasma. */
export function tierProgress(joules: number): number {
  const tier = TIERS.find((t) => joules >= t.min && (t.max === null || joules <= t.max))!;
  if (tier.max === null) return 1;
  return (joules - tier.min) / (tier.max + 1 - tier.min);
}

export function nextTierAt(joules: number): number | null {
  const tier = TIERS.find((t) => joules >= t.min && (t.max === null || joules <= t.max))!;
  return tier.max === null ? null : tier.max + 1;
}
