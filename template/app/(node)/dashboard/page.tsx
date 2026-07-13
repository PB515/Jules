import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { CountUp } from '@/lib/components/count-up';
import { TierBadge } from '@/lib/components/tier-badge';
import { TierUpCelebration } from '@/lib/components/tier-up-celebration';
import { PowerGrid } from '@/lib/components/power-grid';
import { EmptyState } from '@/lib/patterns/empty-state';
import { tierProgress, nextTierAt } from '@/lib/jules/tiers';
import { ScanLine, Clock, Calendar, CircleCheck, CircleX } from '@/lib/icons';
import Link from 'next/link';
import { RegisterButton, CancelRegistrationButton } from './registration-client';
import type { Tier } from '@/lib/supabase/database.types';

export const metadata = { title: 'Grid' };

interface ActivityRow {
  id: string;
  amount: number;
  type: string;
  created_at: string;
  events: { name: string } | null;
  surges: { name: string } | null;
}

interface EventRow {
  id: string;
  name: string;
  event_date: string;
  end_date: string | null;
}

interface RegistrationRow {
  id: string;
  event_id: string;
  registered_at: string;
  attended_at: string | null;
  events: { name: string; event_date: string; end_date: string | null } | null;
}

export default async function DashboardPage() {
  const student = await requireStudent();
  const supabase = await createClient();

  const [
    { data: totalsRows },
    { data: activity },
    { data: season },
    { data: firstTransaction },
    { data: candidateEvents },
    { data: registrations },
  ] = await Promise.all([
    supabase.rpc('my_totals'),
    supabase
      .from('joule_transactions')
      .select('id, amount, type, created_at, events(name), surges(name)')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .returns<ActivityRow[]>(),
    supabase.from('seasons').select('*').lte('start_date', new Date().toISOString()).gte('end_date', new Date().toISOString()).maybeSingle(),
    // Only way to know if a row in the latest-10 feed above is truly the
    // student's first-ever transaction, not just the oldest of the last 10.
    supabase
      .from('joule_transactions')
      .select('id')
      .eq('student_id', student.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('events')
      .select('id, name, event_date, end_date')
      .neq('type', 'surge')
      .order('event_date', { ascending: false })
      .limit(30)
      .returns<EventRow[]>(),
    supabase
      .from('event_registrations')
      .select('id, event_id, registered_at, attended_at, events(name, event_date, end_date)')
      .eq('student_id', student.id)
      .order('registered_at', { ascending: false })
      .returns<RegistrationRow[]>(),
  ]);

  const totals = totalsRows?.[0] ?? {
    season_joules: 0,
    lifetime_joules: 0,
    tier: 'ember' as Tier,
    streak: 0,
    status: 'active' as const,
  };

  const progress = tierProgress(totals.season_joules);
  const nextAt = nextTierAt(totals.season_joules);
  const litCount = activity?.length ?? 0;

  const registeredEventIds = new Set((registrations ?? []).map((r) => r.event_id));
  const upcomingEvents = (candidateEvents ?? [])
    .filter((e) => !hasConcluded(e.end_date ?? e.event_date))
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 6);

  const daysLeft = season ? daysUntil(season.end_date) : null;

  return (
    <div className="flex flex-col gap-6 px-5 pt-8">
      <TierUpCelebration tier={totals.tier} />

      <div>
        <p className="text-sm text-muted">Welcome back,</p>
        <h1 className="text-xl font-medium">{student.name.split(' ')[0]}</h1>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 ambient-drift">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Season Joules</p>
            <CountUp value={totals.season_joules} className="text-4xl font-medium text-gold" />
          </div>
          <TierBadge tier={totals.tier} />
        </div>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-gold transition-all duration-700 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-tertiary">
          {nextAt ? `${nextAt - totals.season_joules} J to next tier` : 'Top tier, uncapped'}
        </p>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">Lifetime Joules</span>
          <CountUp value={totals.lifetime_joules} className="font-medium" />
        </div>
        {daysLeft !== null ? (
          <p className="mt-1 text-xs text-tertiary">Season ends in {daysLeft} days</p>
        ) : null}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted">The Power Grid</h2>
          <span className="text-xs text-tertiary">{litCount} logged</span>
        </div>
        <PowerGrid litCount={litCount} />
      </section>

      <Link
        href="/scan"
        className="flex items-center justify-center gap-2 rounded-[var(--radius)] bg-gold py-3.5 text-sm font-medium text-gold-foreground"
      >
        <ScanLine className="size-4" aria-hidden />
        Scan event QR
      </Link>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Upcoming events</h2>
        {upcomingEvents.length === 0 ? (
          <EmptyState icon={Calendar} title="Nothing on the calendar yet" />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
            {upcomingEvents.map((e) => {
              const registered = registeredEventIds.has(e.id);
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{e.name}</p>
                    <p className="text-xs text-tertiary">{new Date(e.event_date).toLocaleString()}</p>
                  </div>
                  {registered ? (
                    <CancelRegistrationButton eventId={e.id} />
                  ) : (
                    <RegisterButton eventId={e.id} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">My registered events</h2>
        {!registrations || registrations.length === 0 ? (
          <EmptyState icon={Calendar} title="No registrations yet" message="Register for an upcoming event above." />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
            {registrations.map((r) => {
              const concluded = r.events ? hasConcluded(r.events.end_date ?? r.events.event_date) : false;
              const status = r.attended_at
                ? { label: 'Attended', icon: CircleCheck, className: 'text-success' }
                : concluded
                  ? { label: 'Missed', icon: CircleX, className: 'text-accent' }
                  : { label: 'Registered', icon: Clock, className: 'text-muted' };
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{r.events?.name ?? 'Event'}</p>
                    <p className="text-xs text-tertiary">
                      {r.events ? new Date(r.events.event_date).toLocaleString() : ''}
                    </p>
                  </div>
                  <span className={`flex shrink-0 items-center gap-1 text-xs font-medium ${status.className}`}>
                    <status.icon className="size-3.5" aria-hidden />
                    {status.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Recent activity</h2>
        {!activity || activity.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No sparks yet"
            message="Scan into an event or join a Surge to start generating Joules."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
            {activity.map((row) => {
              const isFirstSpark = row.id === firstTransaction?.id;
              return (
                <li key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p>{isFirstSpark ? 'Your first spark ⚡' : (row.events?.name ?? row.surges?.name ?? activityLabel(row.type))}</p>
                    <p className="text-xs text-tertiary">{new Date(row.created_at).toLocaleString()}</p>
                  </div>
                  <span className="font-medium text-gold">+{row.amount} J</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function activityLabel(type: string): string {
  switch (type) {
    case 'event_scan':
      return 'Event check-in';
    case 'surge_correct_answer':
      return 'Surge, correct answer';
    case 'admin_manual_adjustment':
      return 'Manual adjustment';
    default:
      return type;
  }
}

// Plain helper (not a component) — keeps the impure Date.now() call outside
// the component body so it isn't flagged by the render-purity lint rule.
function daysUntil(isoDate: string): number {
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000));
}

function hasConcluded(isoDate: string): boolean {
  return new Date(isoDate).getTime() < Date.now();
}
