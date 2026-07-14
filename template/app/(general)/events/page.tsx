import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/lib/patterns/empty-state';
import { Calendar, MapPin } from '@/lib/icons';

export const metadata = { title: 'Events' };

const TYPE_LABEL: Record<string, string> = {
  standard_meeting: 'Standard Meeting',
  expert_session: 'Expert Session',
  volunteer_task: 'Volunteer Task',
};

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase.rpc('public_events');

  const now = new Date();
  const upcoming = (events ?? [])
    .filter((e) => new Date(e.event_date) >= now)
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const past = (events ?? [])
    .filter((e) => new Date(e.event_date) < now)
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-medium">Events</h1>
        <p className="mt-1 text-sm text-muted">Meetings, expert sessions, and volunteer tasks, all in one calendar.</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Upcoming</h2>
        {upcoming.length === 0 ? (
          <EmptyState icon={Calendar} title="Nothing scheduled yet" message="Check back soon for the next event." />
        ) : (
          <EventList events={upcoming} />
        )}
      </section>

      {past.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted">Past</h2>
          <EventList events={past} />
        </section>
      ) : null}
    </div>
  );
}

function EventList({
  events,
}: {
  events: { id: string; name: string; type: string; event_date: string; location: string | null }[];
}) {
  return (
    <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
      {events.map((e) => (
        <li key={e.id}>
          <Link href={`/events/${e.id}`} className="flex items-center justify-between px-4 py-3.5 hover:bg-background">
            <div>
              <p className="text-sm font-medium">{e.name}</p>
              <p className="mt-0.5 text-xs text-tertiary">{TYPE_LABEL[e.type] ?? e.type}</p>
              {e.location ? (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-tertiary">
                  <MapPin className="size-3" aria-hidden />
                  {e.location}
                </p>
              ) : null}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Calendar className="size-3.5" aria-hidden />
              {new Date(e.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
