'use client';

import { useActionState } from 'react';
import { createSurgeAction, type ActionResult } from '../actions';

const initialState: ActionResult = {};

export function NewSurgeForm({ clubs }: { clubs: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createSurgeAction, initialState);

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-lg font-medium">New Surge</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Name</span>
          <input name="name" className="input" placeholder="Winter Surge 2026" required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Club</span>
          <select name="club_id" className="input" required>
            <option value="">Choose a club…</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Joules per correct answer</span>
          <input name="points_per_question" type="number" min={1} defaultValue={20} className="input" />
        </label>
        {state?.error ? <p className="text-sm text-accent">{state.error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius)] bg-gold py-3 text-sm font-medium text-gold-foreground disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create Surge'}
        </button>
      </form>
    </div>
  );
}
