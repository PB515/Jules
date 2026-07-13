'use client';
/**
 * "Your Collection" — a threshold-ordered tech-tree of avatar cosmetics,
 * replacing a flat list so the connecting line encodes real information
 * (unlock order), not decoration. Newly-crossed items play a short GSAP
 * reveal (glow -> scale-in -> label swap) via useGSAP, scoped to this
 * component's own container so cleanup is automatic and selectors can't
 * leak outside it (gsap-react's core rule). Never inside the R3F canvas —
 * this is DOM/SVG chrome only, so it never fights avatar-scene.tsx's
 * frameloop="demand".
 *
 * "Newly crossed" is detected the same way tier-up-celebration.tsx detects
 * a tier change: remember the last lifetime_joules this browser saw,
 * compare on the next visit. Colors are read straight from color_hex
 * (server data), not tokens — deliberately per-item, not a fixed palette.
 */
import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { AvatarItemState } from '@/lib/jules/avatar-items';

const STORAGE_KEY = 'jules_last_lifetime_joules';

function lockedLabel(item: AvatarItemState): string {
  return `${slotLabel(item.slot)} · locked, ${item.joule_threshold.toLocaleString()} J`;
}

function unlockedLabel(item: AvatarItemState): string {
  return `${slotLabel(item.slot)} · unlocked at ${item.joule_threshold.toLocaleString()} J`;
}

function slotLabel(slot: AvatarItemState['slot']): string {
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

function itemIconSrc(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `/images/avatar-items/${slug}.png`;
}

export function CollectionTree({ items, lifetimeJoules }: { items: AvatarItemState[]; lifetimeJoules: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [newlyUnlockedIds, setNewlyUnlockedIds] = useState<string[]>([]);

  useEffect(() => {
    const previous = window.localStorage.getItem(STORAGE_KEY);
    window.localStorage.setItem(STORAGE_KEY, String(lifetimeJoules));
    const previousJoules = previous !== null ? Number(previous) : null;

    if (previousJoules !== null) {
      const newly = items.filter((item) => item.unlocked && item.joule_threshold > previousJoules);
      if (newly.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot kickoff, same pattern as tier-up-celebration.tsx
        setNewlyUnlockedIds(newly.map((item) => item.id));
      }
    }
    // Only ever run once per mount — re-running on every `items` identity
    // change would re-fire the "previous vs current" comparison mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useGSAP(
    () => {
      newlyUnlockedIds.forEach((id) => {
        const row = containerRef.current?.querySelector<HTMLElement>(`[data-item-id="${id}"]`);
        const node = row?.querySelector<HTMLElement>('.item-node');
        const icon = row?.querySelector<HTMLElement>('.item-icon');
        const meta = row?.querySelector<HTMLElement>('.item-meta');
        if (!row || !node || !icon || !meta) return;

        gsap
          .timeline()
          .to([node, icon], { boxShadow: '0 0 16px currentColor', duration: 0.35, ease: 'power1.out' })
          .to(icon, { filter: 'grayscale(0) opacity(1)', duration: 0.3 }, '<')
          .to(row, { scale: 1.06, duration: 0.3, ease: 'back.out(2)' }, '<0.05')
          .to(meta, { opacity: 0, duration: 0.15 }, '<')
          .call(() => {
            meta.textContent = unlockedLabel(items.find((i) => i.id === id)!);
          })
          .to(meta, { opacity: 1, duration: 0.15 })
          .to(row, { scale: 1, duration: 0.2 }, '<');
      });
    },
    { scope: containerRef, dependencies: [newlyUnlockedIds] }
  );

  const unlockedCount = items.filter((item) => item.unlocked).length;

  return (
    <div ref={containerRef} className="rounded-[var(--radius)] border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">Your Collection</span>
        <span className="text-xs text-tertiary">
          {unlockedCount} / {items.length} unlocked
        </span>
      </div>
      <div className="relative flex flex-col pl-[22px]">
        <div className="absolute top-1.5 bottom-1.5 left-[9px] w-px bg-border" aria-hidden />
        {items.map((item) => (
          <div key={item.id} data-item-id={item.id} className="relative flex items-center gap-2.5 py-1.5" style={{ color: item.color_hex }}>
            <div
              className="item-node z-10 -ml-[22px] h-[18px] w-[18px] flex-shrink-0 rounded-full border-2 bg-card"
              style={{ borderColor: item.unlocked ? 'currentColor' : 'var(--border)' }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- small inventory-style icon, not an optimizable content image */}
            <img
              src={itemIconSrc(item.name)}
              alt=""
              className={`item-icon h-9 w-9 flex-shrink-0 rounded-lg border object-cover ${item.unlocked ? '' : 'grayscale opacity-40'}`}
              style={{ borderColor: item.unlocked ? 'currentColor' : 'var(--border)' }}
            />
            <div>
              <p className="text-[13px] font-medium text-foreground">{item.name}</p>
              <p className={`item-meta text-[10.5px] text-tertiary ${item.unlocked ? '' : 'opacity-55'}`}>
                {item.unlocked ? unlockedLabel(item) : lockedLabel(item)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
