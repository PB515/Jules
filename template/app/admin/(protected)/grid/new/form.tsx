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
            <option value="participation">Participation (10 SP)</option>
            <option value="expert_session">Expert session (5 SP)</option>
            <option value="volunteer_task">Volunteer task (15 SP)</option>
          </select>
        </label>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs text-muted">Start date</span>
            <input name="event_date" type="date" className="input" required />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs text-muted">Start time</span>
            <input name="event_time" type="time" className="input" required />
          </label>
        </div>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs text-muted">End date (optional)</span>
            <input name="event_end_date" type="date" className="input" />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs text-muted">End time (optional)</span>
            <input name="event_end_time" type="time" className="input" />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Attendance window</span>
          <select name="attendance_duration_minutes" className="input" defaultValue={20}>
            <option value={15}>15 minutes</option>
            <option value={20}>20 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
          <span className="text-xs text-tertiary">
            How long the QR check-in stays open once someone presses &quot;Start attendance&quot; at the event.
            Not tied to the scheduled time above, so a delayed event is never a problem.
          </span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Location (optional)</span>
          <input name="location" className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Registration form link (optional)</span>
          <input name="registration_form_url" type="url" className="input" placeholder="https://forms.gle/…" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Cover image (optional)</span>
          <input name="cover_image" type="file" accept="image/jpeg,image/png,image/webp" className="input" />
          <span className="text-xs text-tertiary">JPG, PNG, or WebP · up to 5MB · shown at 16:9, so 1280×720 or similar fits best.</span>
        </label>
        {state?.error ? <p className="text-sm text-accent">{state.error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="bg-adani-gradient rounded-[var(--radius)] py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create event'}
        </button>
      </form>
    </div>
  );
}
