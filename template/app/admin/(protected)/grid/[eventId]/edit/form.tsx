'use client';

import { useActionState } from 'react';
import { editEventAction, type ActionResult } from '../../actions';
import type { Tables } from '@/lib/supabase/database.types';

const initialState: ActionResult = {};

// Local (not UTC-pinned) is intentional here — separate date/time inputs
// reflect whatever the admin's own browser/OS timezone is, and re-submitting
// the form unchanged should round-trip to the same instant, not drift.
function toDateValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toTimeValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
            <option value="participation">Participation (10 SP)</option>
            <option value="expert_session">Expert session (5 SP)</option>
            <option value="volunteer_task">Volunteer task (15 SP)</option>
          </select>
        </label>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs text-muted">Date</span>
            <input
              name="event_date"
              type="date"
              className="input"
              defaultValue={toDateValue(event.event_date)}
              required
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs text-muted">Time</span>
            <input
              name="event_time"
              type="time"
              className="input"
              defaultValue={toTimeValue(event.event_date)}
              required
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Attendance window</span>
          <select
            name="attendance_duration_minutes"
            className="input"
            defaultValue={event.attendance_duration_minutes}
          >
            <option value={15}>15 minutes</option>
            <option value={20}>20 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
          <span className="text-xs text-tertiary">
            How long the QR check-in stays open once someone presses &quot;Start attendance&quot; at the event.
          </span>
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
          <input name="cover_image" type="file" accept="image/jpeg,image/png,image/webp" className="input" />
          <span className="text-xs text-tertiary">JPG, PNG, or WebP · up to 5MB · shown at 16:9, so 1280×720 or similar fits best.</span>
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
