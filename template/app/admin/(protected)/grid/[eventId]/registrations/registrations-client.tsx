'use client';
/**
 * Professor's live registrations dashboard. Real-time, mirroring the
 * pattern proven by Live Round's host-client.tsx: one channel, `event: '*'`
 * handlers that always refetch (`refreshRegistrations()`) rather than patch
 * the payload directly — the payload-patching approach is exactly what
 * broke once already (decision 60) when a DELETE arrived with an
 * incomplete payload the client-side filter couldn't evaluate. Refetching
 * sidesteps that whole class of bug regardless of what a given payload
 * does or doesn't carry.
 *
 * Visual-dashboard pass (stat cards, sparkline, pulse-on-new-row, CSV
 * export) added post-launch — the original version was a plain list; this
 * is deliberately closer to Synergy's own visual identity than a generic
 * admin table.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDateUTC, formatTimeUTC } from '@/lib/jules/format-date';
import { EmptyState } from '@/lib/patterns/empty-state';
import { CountUp } from '@/lib/components/count-up';
import { getEventRegistrations, bucketRegistrationsByHour, type EventRegistrationRow } from '@/lib/jules/event-registrations';
import { rowsToCsv, downloadCsv } from '@/lib/jules/csv-export';
import { Users, Mail, Phone, CircleCheck, Download } from '@/lib/icons';

export function RegistrationsClient({
  eventId,
  eventName,
  initialRegistrations,
}: {
  eventId: string;
  eventName: string;
  initialRegistrations: EventRegistrationRow[];
}) {
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const supabase = useRef(createClient()).current;
  const knownIds = useRef(new Set(initialRegistrations.map((r) => r.id)));

  const refreshRegistrations = useCallback(async () => {
    const rows = await getEventRegistrations(supabase, eventId);
    const fresh = rows.filter((r) => !knownIds.current.has(r.id)).map((r) => r.id);
    if (fresh.length > 0) {
      setNewIds(new Set(fresh));
      setTimeout(() => setNewIds(new Set()), 2500);
    }
    knownIds.current = new Set(rows.map((r) => r.id));
    setRegistrations(rows);
    // supabase is a stable ref value, same intentional-deps pattern as
    // host-client.tsx's own realtime effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    const channel = supabase
      .channel(`event_registrations:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_registrations', filter: `event_id=eq.${eventId}` },
        () => refreshRegistrations()
      )
      .subscribe((status) => {
        // A change that happens in the window between mount and the
        // websocket channel actually reaching SUBSCRIBED can be missed
        // entirely (Realtime only delivers events after subscription is
        // confirmed) — this catch-up fetch the instant it's confirmed live
        // closes that race, so "walked in right as a student registered"
        // never shows stale data with nothing left to trigger a refresh.
        if (status === 'SUBSCRIBED') refreshRegistrations();
      });
    return () => {
      supabase.removeChannel(channel);
    };
    // supabase is a stable ref value; refreshRegistrations is intentionally
    // excluded too (same pattern as host-client.tsx) since it's only ever
    // re-created when eventId changes, which is already the effect's real
    // dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const attendedCount = registrations.filter((r) => r.attended_at).length;
  const hourly = bucketRegistrationsByHour(registrations);
  const maxHourly = Math.max(1, ...hourly.map((h) => h.count));

  function exportCsv() {
    const csv = rowsToCsv(
      ['Name', 'Email', 'Phone', 'Registered At (UTC)', 'Attended At (UTC)'],
      registrations.map((r) => [r.name, r.college_email, r.phone ?? '', r.registered_at, r.attended_at ?? ''])
    );
    downloadCsv(`${eventName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-registrations.csv`, csv);
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-lg font-medium">{eventName}</h1>
        {registrations.length > 0 ? (
          <button
            onClick={exportCsv}
            className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-border px-3 py-1.5 text-xs text-muted hover:border-gold/50 hover:text-gold"
          >
            <Download className="size-3.5" aria-hidden />
            Export CSV
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div data-testid="stat-registered" className="rounded-[var(--radius)] border border-gold/30 bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs text-tertiary">
            <Users className="size-3.5" aria-hidden />
            Registered
          </p>
          <CountUp value={registrations.length} className="text-3xl font-medium text-gold" />
        </div>
        <div data-testid="stat-attended" className="rounded-[var(--radius)] border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs text-tertiary">
            <CircleCheck className="size-3.5" aria-hidden />
            Attended
          </p>
          <CountUp value={attendedCount} className="text-3xl font-medium text-success" />
        </div>
      </div>

      {hourly.length > 1 ? (
        <div className="rounded-[var(--radius)] border border-border bg-card p-4">
          <p className="mb-3 text-xs text-tertiary">Registrations over time</p>
          <div className="flex h-16 items-end gap-1">
            {hourly.map((h) => (
              <div
                key={h.hour}
                className="flex-1 rounded-sm bg-gold/70"
                style={{ height: `${(h.count / maxHourly) * 100}%` }}
                aria-label={`${h.count} registration${h.count === 1 ? '' : 's'}`}
              />
            ))}
          </div>
        </div>
      ) : null}

      {registrations.length === 0 ? (
        <EmptyState icon={Users} title="No registrations yet" message="Registrations will appear here the moment a student signs up." />
      ) : (
        <div className="flex flex-col gap-2">
          {registrations.map((r) => (
            <div
              key={r.id}
              className={`flex flex-col gap-1.5 rounded-[var(--radius)] border p-4 transition-colors duration-1000 ${
                newIds.has(r.id) ? 'border-gold bg-gold/10' : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{r.name}</p>
                {r.attended_at ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-success">
                    <CircleCheck className="size-3.5" aria-hidden />
                    Attended
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-tertiary">Registered</span>
                )}
              </div>
              <p className="flex items-center gap-1.5 text-xs text-tertiary">
                <Mail className="size-3 shrink-0" aria-hidden />
                {r.college_email}
              </p>
              {r.phone ? (
                <p className="flex items-center gap-1.5 text-xs text-tertiary">
                  <Phone className="size-3 shrink-0" aria-hidden />
                  {r.phone}
                </p>
              ) : null}
              <p className="text-xs text-tertiary">
                {formatDateUTC(r.registered_at)} · {formatTimeUTC(r.registered_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
