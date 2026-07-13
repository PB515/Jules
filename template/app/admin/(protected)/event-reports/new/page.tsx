import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { NewEventReportForm } from './form';

export const metadata = { title: 'New Event Report' };

export default async function NewEventReportPage() {
  await requireAdmin(['owner', 'officer']);
  const supabase = await createClient();
  const { data: events } = await supabase
    .from('events')
    .select('id, name, event_date')
    .order('event_date', { ascending: false });

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-1 text-lg font-medium">New Event Report</h1>
      <p className="mb-6 text-xs text-tertiary">Fill in the gaps — the report is ready.</p>
      <NewEventReportForm events={events ?? []} />
    </div>
  );
}
