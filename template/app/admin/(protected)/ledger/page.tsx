import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { EngagementChart } from './engagement-chart';
import { EventTimeline } from './event-timeline';

export const metadata = { title: 'System Ledger' };

export default async function LedgerPage() {
  await requireAdmin(['professor', 'committee_member']);
  const supabase = await createClient();

  const [{ data: monthly }, { data: events }, { data: totals }] = await Promise.all([
    supabase.rpc('monthly_engagement'),
    supabase.from('events').select('id, name, type, event_date, location').order('event_date', { ascending: false }),
    supabase.rpc('event_engagement_totals'),
  ]);

  const totalsMap = new Map((totals ?? []).map((t) => [t.event_id, t]));
  const eventRows = (events ?? []).map((e) => ({
    ...e,
    total_attendees: totalsMap.get(e.id)?.total_attendees ?? 0,
    total_joules: totalsMap.get(e.id)?.total_joules ?? 0,
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <h1 className="text-lg font-medium">System Ledger</h1>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Engagement, by month</h2>
        <EngagementChart rows={monthly ?? []} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Event timeline</h2>
        <EventTimeline events={eventRows} />
      </section>
    </div>
  );
}
