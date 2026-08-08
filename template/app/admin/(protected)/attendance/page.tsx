import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { EmptyState } from '@/lib/patterns/empty-state';
import { ScanLine } from '@/lib/icons';
import { StationClient } from './station-client';
import { EventPicker } from '../event-picker';

export const metadata = { title: 'Attendance' };

/**
 * Every event — upcoming AND past, deliberately no "concluded" filter like
 * Event Creation has, since a real event that ran late is exactly the case
 * this whole feature exists for. Pick one, share this exact URL
 * (`?event=<id>`) with whoever's actually at the event, and they press
 * Start themselves — no need for the person managing the site to be the
 * one pressing the button.
 */
export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const admin = await requireAdmin(['professor', 'committee_member', 'super_admin']);
  const { event: eventParam } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('events')
    .select('id, name, type, event_date, joule_value, attendance_duration_minutes, attendance_opens_at, attendance_closes_at')
    .neq('type', 'surge')
    .order('event_date', { ascending: false })
    .limit(100);
  if ((admin.role === 'professor' || admin.role === 'committee_member') && admin.club_id) {
    query = query.eq('club_id', admin.club_id);
  }
  const { data: events } = await query;

  if (!events || events.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ScanLine}
          title="No events yet"
          message="Create an event first, then come back here to start its attendance."
          action={
            <Link href="/admin/grid/new" className="text-sm text-gold">
              Create an event
            </Link>
          }
        />
      </div>
    );
  }

  const selected = events.find((e) => e.id === eventParam) ?? events[0];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-medium">Attendance</h1>
        <p className="text-sm text-muted">
          Pick an event, press Start, then copy this page&apos;s link to whoever&apos;s actually running it.
        </p>
      </div>
      <EventPicker events={events} selected={selected.id} basePath="/admin/attendance" />
      <StationClient
        key={selected.id}
        eventId={selected.id}
        eventName={selected.name}
        jouleValue={selected.joule_value}
        attendanceDurationMinutes={selected.attendance_duration_minutes}
        attendanceOpensAt={selected.attendance_opens_at}
        attendanceClosesAt={selected.attendance_closes_at}
      />
    </div>
  );
}
