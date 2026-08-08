import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { NAV, GROUP_ORDER } from './admin-nav-items';

export const metadata = { title: 'Home' };

/**
 * Real admin home screen, replacing the old bare role-based redirect
 * (`/admin/grid` or `/admin/ledger`). Every admin page is reachable as a
 * grouped task tile — same NAV data the sidebar renders flat, grouped here
 * into task clusters (Events/Quizzes/Reports & Data/Admin/App), per the
 * user's own "guided, but nothing locked behind a wizard" preference.
 *
 * Attendance is just one tile among the others now (not a separate
 * inline list up top) — with 5+ events needing action, a full list here
 * would ruin the clean tile layout. Its blurb is the one dynamic piece:
 * a live count, so there's still a glance-able signal without listing
 * every event. Opening the tile goes to the real Attendance page
 * (/admin/attendance), which lists everything, upcoming and past.
 */
export default async function AdminHomePage() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  let query = supabase
    .from('events')
    .select('event_date, attendance_closes_at')
    .neq('type', 'surge')
    .limit(200);
  if ((admin.role === 'professor' || admin.role === 'committee_member') && admin.club_id) {
    query = query.eq('club_id', admin.club_id);
  }
  const { data: events } = await query;
  const actionableCount = (events ?? []).filter(isAttendanceActionable).length;
  const attendanceBlurb =
    actionableCount === 0
      ? "All caught up, nothing needs starting"
      : `${actionableCount} event${actionableCount === 1 ? '' : 's'} need${actionableCount === 1 ? 's' : ''} starting`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <h1 className="text-lg font-medium">Home</h1>

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
                      <p className="text-xs text-tertiary">{href === '/admin/attendance' ? attendanceBlurb : blurb}</p>
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

// Matches the same "still actionable" definition the Attendance page's own
// list uses: currently open, or never started and not yet stale.
function isAttendanceActionable(e: { attendance_closes_at: string | null; event_date: string }): boolean {
  const closesMs = e.attendance_closes_at ? new Date(e.attendance_closes_at).getTime() : null;
  const now = Date.now();
  if (closesMs !== null) return closesMs > now;
  const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
  return new Date(e.event_date).getTime() >= threeDaysAgo;
}
