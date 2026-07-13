import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { NewEventReportForm } from './form';

export const metadata = { title: 'New Event Report' };

interface EventOption {
  id: string;
  name: string;
  event_date: string;
  location: string | null;
  clubs: { name: string } | null;
}

export default async function NewEventReportPage() {
  await requireAdmin(['professor', 'committee_member']);
  const supabase = await createClient();
  const { data: events } = await supabase
    .from('events')
    .select('id, name, event_date, location, clubs(name)')
    .order('event_date', { ascending: false })
    .returns<EventOption[]>();

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-1 text-lg font-medium">New Event Report</h1>
      <p className="mb-6 text-xs text-tertiary">Fill in the gaps, the report is ready.</p>
      <NewEventReportForm events={events ?? []} />
    </div>
  );
}
