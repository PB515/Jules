import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { EmptyState } from '@/lib/patterns/empty-state';
import { UpdateEventPicker } from './event-picker';
import { UpdateComposer } from './update-composer';
import { Calendar } from '@/lib/icons';

export const metadata = { title: 'Updates' };

/**
 * The human-controlled notification trigger, discoverable as its own
 * top-level tab rather than buried inside a specific event's own
 * sub-pages — a Committee Member/Professor picks one of their own club's
 * events (any event, for Super Admin) and sends a real update to its
 * registered students. The two automatic triggers (event created,
 * location/date changed) live in grid/actions.ts and need no UI of their
 * own; this is the third, manual one.
 */
export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const admin = await requireAdmin(['professor', 'committee_member', 'super_admin']);
  const { event: selectedEventId } = await searchParams;
  const supabase = await createClient();

  let eventsQuery = supabase
    .from('events')
    .select('id, name, event_date')
    .order('event_date', { ascending: false });
  if (admin.role !== 'super_admin') {
    eventsQuery = eventsQuery.eq('club_id', admin.club_id ?? '');
  }
  const { data: events } = await eventsQuery;

  const activeEvent = events?.find((e) => e.id === selectedEventId) ?? events?.[0];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-medium">Updates</h1>
        <p className="mt-1 text-xs text-tertiary">
          Send a real update about an event to everyone registered for it, a reminder, a change, an announcement.
        </p>
      </div>

      {!events || events.length === 0 || !activeEvent ? (
        <EmptyState icon={Calendar} title="No events yet" message="Create an event first, then come back here to message its registered students." />
      ) : (
        <>
          <UpdateEventPicker events={events} selected={activeEvent.id} />
          <UpdateComposer key={activeEvent.id} eventId={activeEvent.id} eventName={activeEvent.name} />
        </>
      )}
    </div>
  );
}
