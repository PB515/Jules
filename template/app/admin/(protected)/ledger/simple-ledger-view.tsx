import { createClient } from '@/lib/supabase/server';
import { getEventRegistrations } from '@/lib/jules/event-registrations';
import { EmptyState } from '@/lib/patterns/empty-state';
import { LedgerEventPicker } from './ledger-event-picker';
import { RegisteredStudentsList } from './registered-students-list';
import { Calendar } from '@/lib/icons';
import type { Tables } from '@/lib/supabase/database.types';

/**
 * The simplified System Ledger for a club-scoped Professor/Committee
 * Member — pick an event, see who registered, download the list. No
 * charts, no month-by-month breakdown, no full-platform timeline; that's
 * Super Admin's job (the existing dense view in page.tsx, untouched).
 * Reuses getEventRegistrations()/rowsToCsv/downloadCsv, the exact same
 * data path the live Grid Station registrations dashboard already uses.
 */
export async function SimpleLedgerView({ admin, selectedEventId }: { admin: Tables<'admins'>; selectedEventId?: string }) {
  const supabase = await createClient();

  const [{ data: summaryRows }, { data: events }] = await Promise.all([
    supabase.rpc('admin_dashboard_summary'),
    supabase
      .from('events')
      .select('id, name, event_date')
      .eq('club_id', admin.club_id ?? '')
      .neq('type', 'surge')
      .order('event_date', { ascending: false }),
  ]);

  const summary = summaryRows?.[0] ?? { total_students: 0, total_events: 0, total_lifetime_joules: 0 };
  const activeEvent = events?.find((e) => e.id === selectedEventId) ?? events?.[0];
  const registrations = activeEvent ? await getEventRegistrations(supabase, activeEvent.id) : [];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-lg font-medium">System Ledger</h1>

      <p className="text-sm text-muted">
        {summary.total_events} event{summary.total_events === 1 ? '' : 's'} held · {summary.total_students} student
        {summary.total_students === 1 ? '' : 's'} engaged · {summary.total_lifetime_joules} Joules given out
      </p>

      {!events || events.length === 0 || !activeEvent ? (
        <EmptyState icon={Calendar} title="No events yet" message="Create an event to see registrations here." />
      ) : (
        <>
          <LedgerEventPicker events={events} selected={activeEvent.id} />
          <RegisteredStudentsList eventName={activeEvent.name} registrations={registrations} />
        </>
      )}
    </div>
  );
}
