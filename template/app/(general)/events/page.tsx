import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/lib/patterns/empty-state';
import { Calendar } from '@/lib/icons';
import { EventCoverPlaceholder } from '@/lib/components/event-cover-placeholder';
import { formatDateUTC, formatTimeUTC } from '@/lib/jules/format-date';

export const metadata = { title: 'Events' };

const TYPE_LABEL: Record<string, string> = {
  standard_meeting: 'Standard Meeting',
  expert_session: 'Expert Session',
  volunteer_task: 'Volunteer Task',
};

interface EventCardData {
  id: string;
  name: string;
  type: string;
  event_date: string;
  club_name: string | null;
  coverUrl: string | null;
}

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase.rpc('public_events');

  const withUrls: EventCardData[] = (events ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    event_date: e.event_date,
    club_name: e.club_name,
    coverUrl: e.cover_image_path
      ? supabase.storage.from('event-covers').getPublicUrl(e.cover_image_path).data.publicUrl
      : null,
  }));

  const now = new Date();
  const upcoming = withUrls
    .filter((e) => new Date(e.event_date) >= now)
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const past = withUrls
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
          <EventCardGrid events={upcoming} />
        )}
      </section>

      {past.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted">Past</h2>
          <EventCardGrid events={past} />
        </section>
      ) : null}
    </div>
  );
}

function EventCardGrid({ events }: { events: EventCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((e) => (
        <Link
          key={e.id}
          href={`/events/${e.id}`}
          className="flex flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-card transition-colors hover:border-gold/50"
        >
          <div className="flex aspect-video items-center justify-center bg-background">
            {e.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, no next/image domain config needed
              <img src={e.coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <EventCoverPlaceholder className="h-full w-full" />
            )}
          </div>
          <div className="flex flex-col gap-1 p-4">
            <p className="text-sm font-medium">{e.name}</p>
            {e.club_name ? <p className="text-xs text-tertiary">{e.club_name}</p> : null}
            <p className="text-xs text-tertiary">{TYPE_LABEL[e.type] ?? e.type}</p>
            <p className="mt-1 text-xs">
              <span className="text-tertiary">{formatDateUTC(e.event_date)}</span>{' '}
              <span className="font-medium text-accent">{formatTimeUTC(e.event_date)}</span>
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
