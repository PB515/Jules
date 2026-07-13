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
import { useActionState, useState, useTransition } from 'react';
import { createEventReportAction, type ActionResult } from '../actions';
import { formatDateUTC, formatTimeUTC } from '@/lib/jules/format-date';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2 } from '@/lib/icons';

const initialState: ActionResult = {};

interface EventStats {
  total_attendees: number;
  total_joules: number;
}
interface EventOption {
  id: string;
  name: string;
  event_date: string;
  location: string | null;
  clubs: { name: string } | null;
}

function BulletListField({
  label,
  name,
  placeholder,
  items,
  setItems,
}: {
  label: string;
  name: string;
  placeholder: string;
  items: string[];
  setItems: (fn: (prev: string[]) => string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      {items.map((h, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            name={name}
            className="input flex-1"
            placeholder={placeholder}
            value={h}
            onChange={(e) => setItems((prev) => prev.map((item, idx) => (idx === i ? e.target.value : item)))}
          />
          {items.length > 1 ? (
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
              className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] border border-border text-accent"
              aria-label={`Remove ${label.toLowerCase()} item`}
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, ''])}
        className="flex items-center justify-center gap-1.5 rounded-[var(--radius)] border border-dashed border-border py-2 text-xs text-muted hover:text-gold"
      >
        <Plus className="size-3.5" aria-hidden />
        Add {label.toLowerCase()}
      </button>
    </div>
  );
}

export function NewEventReportForm({ events }: { events: EventOption[] }) {
  const [state, formAction, pending] = useActionState(createEventReportAction, initialState);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [, startTransition] = useTransition();
  const [selectedEvent, setSelectedEvent] = useState<EventOption | null>(null);
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

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Which event is this about</span>
        <select
          name="event_id"
          className="input"
          required
          defaultValue=""
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
            <p className="text-lg font-medium">{stats.total_attendees}</p>
            <p className="text-xs text-tertiary">attendees (auto-pulled)</p>
          </div>
          <div>
            <p className="text-lg font-medium text-gold">{stats.total_joules}</p>
            <p className="text-xs text-tertiary">Joules distributed (auto-pulled)</p>
          </div>
        </div>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Coordinator</span>
        <input name="coordinator_name" className="input" placeholder="Dr. Riya Mehta" required />
      </label>

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

      <fieldset className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-4">
        <legend className="px-1 text-xs text-muted">Attachments</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="attachment_attendance_list" className="size-4" />
          Attendance List attached
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="attachment_brochure" className="size-4" />
          Event Brochure/Flyer/e-invitation
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="attachment_geo_photos" className="size-4" />
          Geo-tagged photographs
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="attachment_media_coverage" className="size-4" />
          Social media/Print media coverage (if any)
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
