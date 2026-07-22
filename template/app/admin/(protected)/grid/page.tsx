import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { EmptyState } from '@/lib/patterns/empty-state';
import { ScanLine, Plus, Pencil, Users } from '@/lib/icons';
import { StationClient } from './station-client';
import { EventPicker } from './event-picker';

export const metadata = { title: 'Grid Station' };

export default async function GridStationPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  // The page itself stays reachable by all three tiers (Committee Member
  // still needs the event list + Edit/New links to do their own job), but
  // the actual QR/scanner panel below only ever renders for Professor/Super
  // Admin — Committee Member's job is event creation + Event Report
  // writing, not showing/scanning attendance QR (RBAC rework).
  const admin = await requireAdmin(['professor', 'committee_member', 'super_admin']);
  const canScan = admin.role === 'professor' || admin.role === 'super_admin';
  const { event: eventParam } = await searchParams;
  const supabase = await createClient();

  // A club-scoped Professor/Committee Member only ever sees their own
  // club's events here; a Super Admin sees every club's.
  let query = supabase
    .from('events')
    .select('id, name, type, event_date, end_date, joule_value')
    .neq('type', 'surge')
    .order('event_date', { ascending: false })
    .limit(60);
  if ((admin.role === 'professor' || admin.role === 'committee_member') && admin.club_id) {
    query = query.eq('club_id', admin.club_id);
  }
  const { data: allEvents } = await query;

  // Once an event has concluded there's nothing left to scan for — with 50-60
  // real events on the calendar, leaving them all in this picker forever makes
  // finding the one that's actually active or upcoming impractical. The data
  // itself is untouched; this only narrows what the Scan Station's own picker
  // shows (same "concluded" definition the student Dashboard already uses).
  const events = (allEvents ?? []).filter((e) => !hasConcluded(e.end_date ?? e.event_date));

  if (events.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ScanLine}
          title={allEvents && allEvents.length > 0 ? 'No active or upcoming events' : 'No events yet'}
          message={allEvents && allEvents.length > 0 ? 'Every event on the calendar has already concluded.' : undefined}
          action={
            <Link href="/admin/grid/new" className="text-sm text-gold">
              Create an event
            </Link>
          }
        />
      </div>
    );
  }

  const selected = events.find((e) => e.id === eventParam) ?? events[0];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <EventPicker events={events} selected={selected.id} />
        <Link
          href={`/admin/grid/${selected.id}/edit`}
          className="flex shrink-0 items-center gap-1 rounded-[var(--radius)] border border-border px-3 py-2 text-xs text-muted hover:text-gold"
        >
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </Link>
        {canScan ? (
          <Link
            href={`/admin/grid/${selected.id}/registrations`}
            className="flex shrink-0 items-center gap-1 rounded-[var(--radius)] border border-border px-3 py-2 text-xs text-muted hover:text-gold"
          >
            <Users className="size-3.5" aria-hidden />
            Registrations
          </Link>
        ) : null}
        <Link
          href="/admin/grid/new"
          className="flex shrink-0 items-center gap-1 rounded-[var(--radius)] border border-border px-3 py-2 text-xs text-muted hover:text-gold"
        >
          <Plus className="size-3.5" aria-hidden />
          New
        </Link>
      </div>
      {canScan ? (
        <StationClient
          eventId={selected.id}
          eventName={selected.name}
          jouleValue={selected.joule_value}
          eventDate={selected.event_date}
        />
      ) : (
        <EmptyState
          icon={ScanLine}
          title="QR check-in is staff-only"
          message="Showing and scanning the attendance QR is handled by your club's Professor. You can still create and edit events, and write the Event Report once it's over."
        />
      )}
    </div>
  );
}

function hasConcluded(isoDate: string): boolean {
  return new Date(isoDate).getTime() < Date.now();
}
