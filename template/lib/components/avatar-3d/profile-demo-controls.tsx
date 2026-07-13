'use client';
/**
 * DEMO-ONLY scaffold, temporary for a live professor demo — not a real
 * feature. Lets a "Simulate +300 J" button bump a local lifetimeJoules
 * override so the real cosmetic-unlock celebration on "Your Collection"
 * fires on demand, without needing to actually earn Joules first. Strip
 * this back out to a plain `<CollectionTree items={items} .../>` once the
 * demo is done.
 */
import { useState } from 'react';
import { CollectionTree } from './collection-tree';
import { withUnlockState, type AvatarItem } from '@/lib/jules/avatar-items';

export function ProfileDemoControls({
  avatarItems,
  initialLifetimeJoules,
}: {
  avatarItems: AvatarItem[];
  initialLifetimeJoules: number;
}) {
  const [lifetimeJoules, setLifetimeJoules] = useState(initialLifetimeJoules);
  const items = withUnlockState(avatarItems, lifetimeJoules);

  return (
    <>
      <CollectionTree items={items} lifetimeJoules={lifetimeJoules} />

      <div className="rounded-[var(--radius)] border border-dashed border-accent/50 bg-card p-4">
        <p className="mb-2.5 flex items-center gap-2 text-xs font-medium text-accent">
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] uppercase tracking-wide">Demo</span>
          Simulate cosmetic unlock
        </p>
        <button
          onClick={() => setLifetimeJoules((v) => v + 300)}
          className="w-full rounded-[var(--radius)] border border-border bg-background py-2 text-xs font-medium text-foreground"
        >
          +300 J
        </button>
      </div>
    </>
  );
}
