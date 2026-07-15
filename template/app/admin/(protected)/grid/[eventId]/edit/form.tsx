'use client';

import { useActionState } from 'react';
import { editEventAction, type ActionResult } from '../../actions';
import type { Tables } from '@/lib/supabase/database.types';

const initialState: ActionResult = {};

// Local (not UTC-pinned) is intentional here — a datetime-local input reflects
// whatever the admin's own browser/OS timezone is, and re-submitting the form
// unchanged should round-trip to the same instant, not drift.
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditEventForm({ event, coverImageUrl }: { event: Tables<'events'>; coverImageUrl: string | null }) {
  const [state, formAction, pending] = useActionState(editEventAction, initialState);

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-lg font-medium">Edit event</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="event_id" value={event.id} />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Name</span>
          <input name="name" className="input" defaultValue={event.name} required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Type</span>
          <select name="type" className="input" defaultValue={event.type} required>
            <option value="standard_meeting">Standard meeting (10 J)</option>
            <option value="expert_session">Expert session (25 J)</option>
            <option value="volunteer_task">Volunteer task (50 J)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Date &amp; time</span>
          <input
            name="event_date"
            type="datetime-local"
            className="input"
            defaultValue={toDatetimeLocalValue(event.event_date)}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Location (optional)</span>
          <input name="location" className="input" defaultValue={event.location ?? ''} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Registration form link (optional)</span>
          <input
            name="registration_form_url"
            type="url"
            className="input"
            placeholder="https://forms.gle/…"
            defaultValue={event.registration_form_url ?? ''}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Cover image (optional)</span>
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, no next/image domain config needed
            <img src={coverImageUrl} alt="" className="h-32 w-full rounded-[var(--radius)] object-cover" />
          ) : null}
          <input name="cover_image" type="file" accept="image/*" className="input" />
        </label>
        {state?.error ? <p className="text-sm text-accent">{state.error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius)] bg-gold py-3 text-sm font-medium text-gold-foreground disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
