import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { HomeAttendanceList, type AttendanceEventRow } from './home-attendance-list';
import { NAV, GROUP_ORDER } from './admin-nav-items';

export const metadata = { title: 'Home' };

/**
 * Real admin home screen, replacing the old bare role-based redirect
 * (`/admin/grid` or `/admin/ledger`) — needed as somewhere to surface
 * "Start attendance" prompts now that attendance is decoupled from
 * event_date (0050) and started on demand instead of pre-scheduled.
 *
 * Below the attendance widget, every other admin page is reachable as a
 * grouped task tile — same NAV data the sidebar renders flat, grouped here
 * into task clusters (Events/Quizzes/Reports & Data/Admin/App), per the
 * user's own "guided, but nothing locked behind a wizard" preference. The
 * sidebar itself stays exactly as it was, unchanged, by request.
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
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-lg font-medium">Attendance</h1>
          <p className="text-sm text-muted">
            Events waiting for attendance to be started, or with it open right now.
          </p>
        </div>
        <HomeAttendanceList events={events} showClub={isSuperAdmin} />
      </div>

      <div className="flex flex-col gap-6">
        {GROUP_ORDER.map((group) => {
          const items = NAV.filter((item) => item.group === group && item.roles.includes(admin.role));
          if (items.length === 0) return null;
          return (
            <div key={group} className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted">{group}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {items.map(({ href, label, icon: Icon, blurb }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-gold/40"
                  >
                    <Icon className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-tertiary">{blurb}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
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
