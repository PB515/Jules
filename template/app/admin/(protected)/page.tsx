import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { HomeAttendanceList, type AttendanceEventRow } from './home-attendance-list';

export const metadata = { title: 'Home' };

/**
 * Real admin home screen, replacing the old bare role-based redirect
 * (`/admin/grid` or `/admin/ledger`) — needed as somewhere to surface
 * "Start attendance" prompts now that attendance is decoupled from
 * event_date (0050) and started on demand instead of pre-scheduled.
 *
 * This is deliberately only the attendance-status widget, not the broader
 * home-screen/nav redesign discussed separately — that's the next, distinct
 * piece of work once this ships.
 */
export default async function AdminHomePage() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  let query = supabase
    .from('events')
    .select('id, name, event_date, club_id, attendance_opens_at, attendance_closes_at')
    .neq('type', 'surge')
    .order('event_date', { ascending: true })
    .limit(30);
  if ((admin.role === 'professor' || admin.role === 'committee_member') && admin.club_id) {
    query = query.eq('club_id', admin.club_id);
  }
  const { data: allEvents } = await query;

  const isSuperAdmin = admin.role === 'super_admin';
  const clubNameById = new Map<string, string>();
  if (isSuperAdmin && allEvents && allEvents.length > 0) {
    const { data: clubs } = await supabase.from('clubs').select('id, name');
    for (const c of clubs ?? []) clubNameById.set(c.id, c.name);
  }

  const events: AttendanceEventRow[] = (allEvents ?? [])
    .filter(isAttendanceActionable)
    .map((e) => ({
      id: e.id,
      name: e.name,
      event_date: e.event_date,
      clubName: isSuperAdmin ? (clubNameById.get(e.club_id) ?? null) : null,
      attendance_opens_at: e.attendance_opens_at,
      attendance_closes_at: e.attendance_closes_at,
    }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-medium">Attendance</h1>
        <p className="text-sm text-muted">
          Events waiting for attendance to be started, or with it open right now.
        </p>
      </div>
      <HomeAttendanceList events={events} showClub={isSuperAdmin} />
      <Link href={admin.role === 'professor' ? '/admin/ledger' : '/admin/grid'} className="text-sm text-gold">
        Go to {admin.role === 'professor' ? 'System Ledger' : 'Grid Station'} →
      </Link>
    </div>
  );
}

// A row stays on the home screen while it's still actionable: currently
// open, or never started and not yet stale. Once attendance_closes_at
// passes, it's done — that belongs in Ledger/Reports, not an action list.
function isAttendanceActionable(e: { attendance_closes_at: string | null; event_date: string }): boolean {
  const closesMs = e.attendance_closes_at ? new Date(e.attendance_closes_at).getTime() : null;
  const now = Date.now();
  if (closesMs !== null) return closesMs > now;
  // Never started — still actionable unless it's genuinely stale (a
  // reasonable 3-day grace for "forgot to start it," not an unbounded dump
  // of every event that's ever existed).
  const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
  return new Date(e.event_date).getTime() >= threeDaysAgo;
}
