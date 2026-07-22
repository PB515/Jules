import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { EngagementChart } from './engagement-chart';
import { EventTimeline } from './event-timeline';
import { TierDistributionChart } from './tier-distribution-chart';
import { ClubEngagementChart } from './club-engagement-chart';
import { Users, Trophy, Calendar, Zap } from '@/lib/icons';

export const metadata = { title: 'System Ledger' };

export default async function LedgerPage() {
  const admin = await requireAdmin(['professor', 'committee_member', 'super_admin']);
  const supabase = await createClient();

  // A club-scoped Professor/Committee Member only sees their own club's
  // events in the timeline; a Super Admin sees every club's. The three RPCs
  // below (monthly_engagement, event_engagement_totals, and the 0039 trio)
  // already self-scope by the caller's own admin row.
  let eventsQuery = supabase.from('events').select('id, name, type, event_date, location').order('event_date', { ascending: false });
  if ((admin.role === 'professor' || admin.role === 'committee_member') && admin.club_id) {
    eventsQuery = eventsQuery.eq('club_id', admin.club_id);
  }

  const [{ data: monthly }, { data: events }, { data: totals }, { data: summaryRows }, { data: tierRows }, { data: clubRows }] =
    await Promise.all([
      supabase.rpc('monthly_engagement'),
      eventsQuery,
      supabase.rpc('event_engagement_totals'),
      supabase.rpc('admin_dashboard_summary'),
      supabase.rpc('admin_tier_distribution'),
      supabase.rpc('admin_club_engagement'),
    ]);

  const summary = summaryRows?.[0] ?? { total_students: 0, total_clubs: 0, total_events: 0, total_lifetime_joules: 0 };

  const totalsMap = new Map((totals ?? []).map((t) => [t.event_id, t]));
  const eventRows = (events ?? []).map((e) => ({
    ...e,
    total_attendees: totalsMap.get(e.id)?.total_attendees ?? 0,
    total_joules: totalsMap.get(e.id)?.total_joules ?? 0,
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <h1 className="text-lg font-medium">System Ledger</h1>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard icon={Users} label="Students" value={summary.total_students} />
        <SummaryCard icon={Trophy} label="Clubs" value={summary.total_clubs} />
        <SummaryCard icon={Calendar} label="Events" value={summary.total_events} />
        <SummaryCard icon={Zap} label="Joules distributed" value={summary.total_lifetime_joules} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Engagement, by month</h2>
        <EngagementChart rows={monthly ?? []} />
      </section>

      <div className="grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted">Students by tier</h2>
          <TierDistributionChart rows={tierRows ?? []} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted">Engagement, by club</h2>
          <ClubEngagementChart rows={clubRows ?? []} />
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Event timeline</h2>
        <EventTimeline events={eventRows} />
      </section>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-4">
      <Icon className="size-4 text-gold" aria-hidden />
      <p className="mt-2 text-lg font-medium">{value.toLocaleString()}</p>
      <p className="text-xs text-tertiary">{label}</p>
    </div>
  );
}
