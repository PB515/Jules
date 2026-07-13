'use client';

import { useActionState } from 'react';
import { createEventAction, type ActionResult } from '../actions';

const initialState: ActionResult = {};

export function NewEventForm({ clubs }: { clubs: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createEventAction, initialState);

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-lg font-medium">New event</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Name</span>
          <input name="name" className="input" required />
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
          <span className="text-xs text-muted">Type</span>
          <select name="type" className="input" required>
            <option value="standard_meeting">Standard meeting (10 J)</option>
            <option value="expert_session">Expert session (25 J)</option>
            <option value="volunteer_task">Volunteer task (50 J)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Date &amp; time</span>
          <input name="event_date" type="datetime-local" className="input" required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Location (optional)</span>
          <input name="location" className="input" />
        </label>
        {state?.error ? <p className="text-sm text-accent">{state.error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius)] bg-gold py-3 text-sm font-medium text-gold-foreground disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create event'}
        </button>
      </form>
    </div>
  );
}
