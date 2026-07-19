'use client';
/**
 * Professor's live registrations view. Real-time, mirroring the pattern
 * proven by Live Round's host-client.tsx: one channel, `event: '*'` handlers
 * that always refetch (`refreshRegistrations()`) rather than patch the
 * payload directly — the payload-patching approach is exactly what broke
 * once already (decision 60) when a DELETE arrived with an incomplete
 * payload the client-side filter couldn't evaluate. Refetching sidesteps
 * that whole class of bug regardless of what a given payload does or
 * doesn't carry.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDateUTC, formatTimeUTC } from '@/lib/jules/format-date';
import { EmptyState } from '@/lib/patterns/empty-state';
import { Users, Mail, Phone, CircleCheck } from '@/lib/icons';

interface Registration {
  id: string;
  registered_at: string;
  attended_at: string | null;
  name: string;
  college_email: string;
  phone: string | null;
}

export function RegistrationsClient({
  eventId,
  eventName,
  initialRegistrations,
}: {
  eventId: string;
  eventName: string;
  initialRegistrations: Registration[];
}) {
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const supabase = useRef(createClient()).current;

  const refreshRegistrations = useCallback(async () => {
    const { data } = await supabase
      .from('event_registrations')
      .select('id, registered_at, attended_at, students(name, college_email, phone)')
      .eq('event_id', eventId)
      .order('registered_at', { ascending: false });
    setRegistrations(
      (data ?? []).map((r) => ({
        id: r.id,
        registered_at: r.registered_at,
        attended_at: r.attended_at,
        name: r.students?.name ?? 'Unknown',
        college_email: r.students?.college_email ?? '',
        phone: r.students?.phone ?? null,
      }))
    );
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

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-medium">{eventName}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <Users className="size-4" aria-hidden />
          {registrations.length} registered
        </p>
      </div>

      {registrations.length === 0 ? (
        <EmptyState icon={Users} title="No registrations yet" message="Registrations will appear here the moment a student signs up." />
      ) : (
        <div className="flex flex-col gap-2">
          {registrations.map((r) => (
            <div key={r.id} className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-border bg-card p-4">
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
