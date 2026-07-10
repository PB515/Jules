'use client';

import { useActionState, useState } from 'react';
import { createSeasonAction, type ActionResult } from './actions';
import { EmptyState } from '@/lib/patterns/empty-state';
import { Calendar } from '@/lib/icons';

interface Season {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  cadence: string;
}

const initialState: ActionResult = {};

export function SeasonsSection({ seasons }: { seasons: Season[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createSeasonAction, initialState);

  return (
    <div className="flex flex-col gap-3">
      {seasons.length === 0 ? (
        <EmptyState icon={Calendar} title="No seasons yet" />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
          {seasons.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{s.label}</span>
              <span className="text-xs text-tertiary">
                {s.start_date} → {s.end_date} · {s.cadence}
              </span>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <form action={formAction} className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
          <input name="label" className="input" placeholder="e.g. Odd/Monsoon 2027" required />
          <div className="flex gap-3">
            <input name="start_date" type="date" className="input" required />
            <input name="end_date" type="date" className="input" required />
          </div>
          <select name="cadence" className="input">
            <option value="semester">Semester</option>
            <option value="trimester">Trimester</option>
            <option value="annual">Annual</option>
            <option value="custom">Custom</option>
          </select>
          {state?.error ? <p className="text-sm text-accent">{state.error}</p> : null}
          <div className="flex gap-2">
            <button disabled={pending} className="flex-1 rounded-[var(--radius)] bg-gold py-2 text-sm font-medium text-gold-foreground">
              {pending ? 'Adding…' : 'Add season'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-[var(--radius)] border border-border py-2 text-sm">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="rounded-[var(--radius)] border border-dashed border-border py-2.5 text-sm text-muted hover:text-gold">
          + Add season
        </button>
      )}
    </div>
  );
}
