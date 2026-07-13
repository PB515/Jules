/**
 * Avatar cosmetic-unlock helpers. Mirrors tiers.ts's "computed, never
 * stored" philosophy (decision 11) — whether an item is unlocked is derived
 * by comparing lifetime_joules (never resets, decision 5) against each
 * item's joule_threshold, never a per-student unlock-state row.
 */
import type { AvatarSlot } from '@/lib/supabase/database.types';

export interface AvatarItem {
  id: string;
  slot: AvatarSlot;
  name: string;
  joule_threshold: number;
  color_hex: string;
}

export interface AvatarItemState extends AvatarItem {
  unlocked: boolean;
}

export function withUnlockState(items: AvatarItem[], lifetimeJoules: number): AvatarItemState[] {
  return items.map((item) => ({ ...item, unlocked: lifetimeJoules >= item.joule_threshold }));
}

export function unlockedCount(items: AvatarItemState[]): number {
  return items.filter((item) => item.unlocked).length;
}

/** The single most-recently-crossed item, used to drive the unlock celebration. */
export function latestUnlocked(items: AvatarItemState[]): AvatarItemState | null {
  const unlocked = items.filter((item) => item.unlocked);
  return unlocked.length > 0 ? unlocked[unlocked.length - 1] : null;
}
