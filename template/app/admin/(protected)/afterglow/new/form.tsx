'use client';

import { useActionState } from 'react';
import { createAfterglowPostAction, type ActionResult } from '../actions';
import { formatDateUTC } from '@/lib/jules/format-date';

const initialState: ActionResult = {};

export function NewAfterglowForm({ events }: { events: { id: string; name: string; event_date: string }[] }) {
  const [state, formAction, pending] = useActionState(createAfterglowPostAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Which event is this about</span>
        <select name="event_id" className="input" required defaultValue="">
          <option value="" disabled>
            Choose an event
          </option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({formatDateUTC(e.event_date)})
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Title</span>
        <input name="title" className="input" placeholder="A great turnout for the Winter Surge" required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Write-up</span>
        <textarea name="body" className="input min-h-48" placeholder="What happened, how it went, what stood out..." required />
      </label>
      {state?.error ? <p className="text-sm text-accent">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius)] bg-gold py-3 text-sm font-medium text-gold-foreground disabled:opacity-60"
      >
        {pending ? 'Publishing…' : 'Publish'}
      </button>
    </form>
  );
}
