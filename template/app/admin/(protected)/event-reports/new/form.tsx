'use client';
/**
 * Event Report form, rebuilt to match the real Adani University "Event
 * Completion Report" template (a professor-supplied reference doc, not a
 * guess) — Introduction/Objectives/Event Highlights/Outcomes/Conclusion,
 * plus an Attachments checklist. Date/Time/Venue/Organised-by-club are
 * auto-filled from the linked event and read-only, not retyped — the event
 * row is already the source of truth for those, matching the "fill the
 * gaps, report is ready" ask. Attendance/Joules stay auto-pulled from
 * public_event_stats(), same as before.
 */
import { useActionState, useEffect, useState, useTransition } from 'react';
import { createEventReportAction, type ActionResult } from '../actions';
import { formatDateUTC, formatTimeUTC } from '@/lib/jules/format-date';
import { createClient } from '@/lib/supabase/client';
import { BulletListField } from '@/lib/patterns/bullet-list-field';

const initialState: ActionResult = {};

interface EventStats {
  total_attendees: number;
  total_joules: number;
  total_registered: number;
}
interface EventOption {
  id: string;
  name: string;
  event_date: string;
  location: string | null;
  clubs: { name: string } | null;
}

export function NewEventReportForm({ events, defaultEventId }: { events: EventOption[]; defaultEventId?: string }) {
  const [state, formAction, pending] = useActionState(createEventReportAction, initialState);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [, startTransition] = useTransition();
  const [selectedEvent, setSelectedEvent] = useState<EventOption | null>(null);
  const [coordinators, setCoordinators] = useState(['']);
  const [objectives, setObjectives] = useState(['']);
  const [outcomes, setOutcomes] = useState(['']);

  function onEventChange(eventId: string) {
    const event = events.find((e) => e.id === eventId) ?? null;
    setSelectedEvent(event);
    if (!eventId) {
      setStats(null);
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc('public_event_stats', { p_event_id: eventId });
      setStats(data?.[0] ?? null);
    });
  }

  // ?event=<id> deep link (Phase 2: "hand a Committee Member a direct link
  // to the exact event," so they don't have to hunt for it in the picker) —
  // a plain <select defaultValue> wouldn't also trigger the stats fetch, so
  // this mirrors onEventChange's own logic once on mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot sync from a prop, same pattern as lib/components/count-up.tsx
    if (defaultEventId && events.some((e) => e.id === defaultEventId)) onEventChange(defaultEventId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultEventId]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Which event is this about</span>
        <select
          name="event_id"
          className="input"
          required
          defaultValue={defaultEventId ?? ''}
          onChange={(e) => onEventChange(e.target.value)}
        >
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

      {selectedEvent ? (
        <div className="grid grid-cols-2 gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3 text-sm">
          <div>
            <p className="text-xs text-tertiary">Date</p>
            <p>{formatDateUTC(selectedEvent.event_date)}</p>
          </div>
          <div>
            <p className="text-xs text-tertiary">Time</p>
            <p>{formatTimeUTC(selectedEvent.event_date)}</p>
          </div>
          <div>
            <p className="text-xs text-tertiary">Venue</p>
            <p>{selectedEvent.location ?? 'Not set'}</p>
          </div>
          <div>
            <p className="text-xs text-tertiary">Organised by</p>
            <p>{selectedEvent.clubs?.name ?? 'Not set'}</p>
          </div>
        </div>
      ) : null}

      {stats ? (
        <div className="flex gap-6 rounded-[var(--radius)] border border-border bg-card px-4 py-3 text-sm">
          <div>
            <p className="text-lg font-medium">{stats.total_registered}</p>
            <p className="text-xs text-tertiary">registered (auto-pulled)</p>
          </div>
          <div>
            <p className="text-lg font-medium">{stats.total_attendees}</p>
            <p className="text-xs text-tertiary">attendees (auto-pulled)</p>
          </div>
          <div>
            <p className="text-lg font-medium text-gold">{stats.total_joules}</p>
            <p className="text-xs text-tertiary">Joules distributed (auto-pulled)</p>
          </div>
        </div>
      ) : null}

      <BulletListField
        label="Coordinators"
        name="coordinators"
        placeholder="e.g. Dr. Riya Mehta (President)"
        items={coordinators}
        setItems={setCoordinators}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Introduction</span>
        <textarea name="introduction" className="input min-h-24" placeholder="The club successfully organized..." required />
      </label>

      <BulletListField
        label="Objectives"
        name="objectives"
        placeholder="e.g. To encourage practical, experiential learning"
        items={objectives}
        setItems={setObjectives}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Event Highlights</span>
        <textarea
          name="event_highlights"
          className="input min-h-24"
          placeholder="What actually happened, in a short narrative..."
          required
        />
      </label>

      <BulletListField
        label="Outcomes"
        name="outcomes"
        placeholder="e.g. Enhanced understanding of..."
        items={outcomes}
        setItems={setOutcomes}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Conclusion</span>
        <textarea name="conclusion" className="input min-h-24" placeholder="A short closing paragraph..." required />
      </label>

      <fieldset className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
        <legend className="px-1 text-xs text-muted">Attachments (upload real photos, not just a checklist)</legend>
        <label className="flex flex-col gap-1 text-sm">
          Attendance List
          <input type="file" name="attachment_attendance_list" accept="image/*" multiple className="input" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Event Brochure/Flyer/e-invitation
          <input type="file" name="attachment_brochure" accept="image/*" multiple className="input" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Geo-tagged photographs
          <input type="file" name="attachment_geo_photos" accept="image/*" multiple className="input" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Social media/Print media coverage (if any)
          <input type="file" name="attachment_media_coverage" accept="image/*" multiple className="input" />
        </label>
      </fieldset>

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
