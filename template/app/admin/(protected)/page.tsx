import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { ArrowRight } from '@/lib/icons';
import { NAV, GROUP_ORDER, type AdminNavItem } from './admin-nav-items';

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
 *
 * "How it works" (below) exists because the tile grid alone doesn't
 * convey sequence — a Committee Member new to the app can't tell that
 * Attendance and Event Reports are downstream of Event Creation just by
 * scanning a grid. Each flow only renders if every one of its steps is
 * actually reachable by the signed-in role (a Committee Member never
 * sees the quiz-hosting flow, since Live Round is staff-only, decision 81).
 */
const FLOWS: { title: string; steps: readonly string[] }[] = [
  { title: 'Running an event', steps: ['/admin/grid', '/admin/attendance', '/admin/event-reports'] },
  { title: 'Running a quiz', steps: ['/admin/surges', '/admin/live/new'] },
];

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

  const flows = FLOWS.map((flow) => {
    const steps: AdminNavItem[] = [];
    for (const href of flow.steps) {
      const item = NAV.find((n) => n.href === href);
      if (!item || !item.roles.includes(admin.role)) break;
      steps.push(item);
    }
    return { title: flow.title, steps, complete: steps.length === flow.steps.length };
  }).filter((flow) => flow.complete);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <h1 className="text-lg font-medium">Home</h1>

      {flows.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted">How it works</h2>
          <div className="flex flex-col gap-3">
            {flows.map((flow) => (
              <div key={flow.title} className="rounded-2xl border border-border bg-card p-4">
                <p className="mb-3 text-xs font-medium text-tertiary">{flow.title}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {flow.steps.map((step, i) => (
                    <div key={step.href} className="flex items-center gap-2">
                      <Link
                        href={step.href}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-gold/40"
                      >
                        <step.icon className="size-3.5 text-gold" aria-hidden />
                        {step.label}
                      </Link>
                      {i < flow.steps.length - 1 && (
                        <ArrowRight className="size-3.5 shrink-0 text-tertiary" aria-hidden />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
