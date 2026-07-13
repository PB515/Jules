'use client';
/**
 * Templated Event Report form (renamed from Afterglow's freeform write-up,
 * per the professor's "report builder" ask — same feature, made
 * fill-in-the-blank instead of write-from-scratch). Attendance/Points are
 * auto-pulled from the same `public_event_stats()` RPC the public detail
 * page already uses, the moment an event is chosen, rather than the admin
 * having to restate them in prose.
 */
import { useActionState, useState, useTransition } from 'react';
import { createEventReportAction, type ActionResult } from '../actions';
import { formatDateUTC } from '@/lib/jules/format-date';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2 } from '@/lib/icons';

const initialState: ActionResult = {};

interface EventStats {
  total_attendees: number;
  total_joules: number;
}

export function NewEventReportForm({ events }: { events: { id: string; name: string; event_date: string }[] }) {
  const [state, formAction, pending] = useActionState(createEventReportAction, initialState);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [, startTransition] = useTransition();
  const [highlights, setHighlights] = useState(['']);

  function onEventChange(eventId: string) {
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
        <span className="text-xs text-muted">Title</span>
        <input name="title" className="input" placeholder="A great turnout for the Winter Surge" required />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Highlights</span>
        {highlights.map((h, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              name="highlights"
              className="input flex-1"
              placeholder="e.g. 142 students turned out"
              value={h}
              onChange={(e) =>
                setHighlights((prev) => prev.map((item, idx) => (idx === i ? e.target.value : item)))
              }
            />
            {highlights.length > 1 ? (
              <button
                type="button"
                onClick={() => setHighlights((prev) => prev.filter((_, idx) => idx !== i))}
                className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] border border-border text-accent"
                aria-label="Remove highlight"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setHighlights((prev) => [...prev, ''])}
          className="flex items-center justify-center gap-1.5 rounded-[var(--radius)] border border-dashed border-border py-2 text-xs text-muted hover:text-gold"
        >
          <Plus className="size-3.5" aria-hidden />
          Add highlight
        </button>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Summary</span>
        <textarea name="summary" className="input min-h-32" placeholder="A short closing paragraph..." required />
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
