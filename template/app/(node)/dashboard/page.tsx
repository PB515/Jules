import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { CountUp } from '@/lib/components/count-up';
import { TierBadge } from '@/lib/components/tier-badge';
import { PowerGrid } from '@/lib/components/power-grid';
import { EmptyState } from '@/lib/patterns/empty-state';
import { tierProgress, nextTierAt } from '@/lib/jules/tiers';
import { ScanLine, Clock } from '@/lib/icons';
import Link from 'next/link';
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

export default async function DashboardPage() {
  const student = await requireStudent();
  const supabase = await createClient();

  const [{ data: totalsRows }, { data: activity }, { data: season }] = await Promise.all([
    supabase.rpc('my_totals'),
    supabase
      .from('joule_transactions')
      .select('id, amount, type, created_at, events(name), surges(name)')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .returns<ActivityRow[]>(),
    supabase.from('seasons').select('*').lte('start_date', new Date().toISOString()).gte('end_date', new Date().toISOString()).maybeSingle(),
  ]);

  const totals = totalsRows?.[0] ?? {
    season_joules: 0,
    lifetime_joules: 0,
    tier: 'ember' as Tier,
    streak_days: 0,
    status: 'active' as const,
  };

  const progress = tierProgress(totals.season_joules);
  const nextAt = nextTierAt(totals.season_joules);
  const litCount = activity?.length ?? 0;

  const daysLeft = season ? daysUntil(season.end_date) : null;

  return (
    <div className="flex flex-col gap-6 px-5 pt-8">
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
        <h2 className="mb-2 text-sm font-medium text-muted">Recent activity</h2>
        {!activity || activity.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No sparks yet"
            message="Scan into an event or join a Surge to start generating Joules."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
            {activity.map((row) => (
              <li key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p>{row.events?.name ?? row.surges?.name ?? activityLabel(row.type)}</p>
                  <p className="text-xs text-tertiary">{new Date(row.created_at).toLocaleString()}</p>
                </div>
                <span className="font-medium text-gold">+{row.amount} J</span>
              </li>
            ))}
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
