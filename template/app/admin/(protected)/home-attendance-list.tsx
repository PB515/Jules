'use client';
/**
 * Live countdown + Start/View links for the admin home screen's attendance
 * widget. The actual Start action lives on Grid Station (station-client.tsx)
 * — this just deep-links there, so there's exactly one place that calls
 * start_event_attendance(). A row disappears client-side the moment its
 * window closes (attendance_closes_at passes "now"), same effect the
 * server-side re-fetch on next page load would produce.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Clock, Calendar } from '@/lib/icons';
import { formatDateUTC, formatTimeUTC } from '@/lib/jules/format-date';
import { EmptyState } from '@/lib/patterns/empty-state';

export interface AttendanceEventRow {
  id: string;
  name: string;
  event_date: string;
  clubName: string | null;
  attendance_opens_at: string | null;
  attendance_closes_at: string | null;
}

export function HomeAttendanceList({ events, showClub }: { events: AttendanceEventRow[]; showClub: boolean }) {
  // Starts at 0, not Date.now() (keeps the component body pure) — the effect
  // below sets a real value within the first tick.
  const [now, setNow] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const visible = events.filter((e) => {
    if (now === 0) return true; // pre-mount placeholder, don't flicker
    if (!e.attendance_closes_at) return true; // never started — always actionable
    return new Date(e.attendance_closes_at).getTime() > now;
  });

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Nothing needs attention"
        message="No event's attendance is currently open or waiting to be started."
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
      {visible.map((e) => {
        const closesMs = e.attendance_closes_at ? new Date(e.attendance_closes_at).getTime() : null;
        const isOpen = now !== 0 && closesMs !== null && closesMs > now;
        const secondsLeft = isOpen ? Math.max(0, Math.round((closesMs! - now) / 1000)) : null;

        return (
          <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{e.name}</p>
              <p className="text-xs text-tertiary">
                {showClub && e.clubName ? `${e.clubName} · ` : ''}
                {formatDateUTC(e.event_date)} · {formatTimeUTC(e.event_date)}
              </p>
            </div>
            {isOpen ? (
              <Link
                href={`/admin/grid?event=${e.id}`}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1.5 text-xs font-medium text-gold"
              >
                <Clock className="size-3.5" aria-hidden />
                {secondsLeft !== null ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')} left` : 'Open'}
              </Link>
            ) : (
              <Link
                href={`/admin/grid?event=${e.id}`}
                className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] bg-gold px-3 py-1.5 text-xs font-medium text-gold-foreground"
              >
                <Play className="size-3.5" aria-hidden />
                Start attendance
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
