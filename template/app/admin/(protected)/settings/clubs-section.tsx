'use client';

import { useActionState, useState } from 'react';
import { createClubAction, type ActionResult } from './actions';
import { EmptyState } from '@/lib/patterns/empty-state';
import { Users } from '@/lib/icons';

interface Club {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

const initialState: ActionResult = {};

export function ClubsSection({ clubs }: { clubs: Club[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createClubAction, initialState);

  return (
    <div className="flex flex-col gap-3">
      {clubs.length === 0 ? (
        <EmptyState icon={Users} title="No clubs yet" />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
          {clubs.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div>
                <p>{c.name}</p>
                <p className="text-xs text-tertiary">{c.description ?? c.slug}</p>
              </div>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">{c.slug}</span>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <form action={formAction} className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
          <input name="name" className="input" placeholder="Club name" required />
          <input name="slug" className="input" placeholder="club-slug" required />
          <input name="description" className="input" placeholder="Short description (optional)" />
          {state?.error ? <p className="text-sm text-accent">{state.error}</p> : null}
          <div className="flex gap-2">
            <button disabled={pending} className="flex-1 rounded-[var(--radius)] bg-gold py-2 text-sm font-medium text-gold-foreground">
              {pending ? 'Adding…' : 'Add club'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-[var(--radius)] border border-border py-2 text-sm">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="rounded-[var(--radius)] border border-dashed border-border py-2.5 text-sm text-muted hover:text-gold">
          + Add club
        </button>
      )}
    </div>
  );
}
