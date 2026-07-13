import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { EmptyState } from '@/lib/patterns/empty-state';
import { ScanLine, Plus } from '@/lib/icons';
import { StationClient } from './station-client';
import { EventPicker } from './event-picker';

export const metadata = { title: 'Grid Station' };

export default async function GridStationPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const admin = await requireAdmin();
  const { event: eventParam } = await searchParams;
  const supabase = await createClient();

  // A Committee Member only ever sees their own club's events here; a
  // Professor sees every club's (club_id is platform-wide, decision 45).
  let query = supabase
    .from('events')
    .select('id, name, type, event_date, joule_value')
    .neq('type', 'surge')
    .order('event_date', { ascending: false })
    .limit(30);
  if (admin.role === 'committee_member' && admin.club_id) {
    query = query.eq('club_id', admin.club_id);
  }
  const { data: events } = await query;

  if (!events || events.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ScanLine}
          title="No events yet"
          action={
            <Link href="/admin/grid/new" className="text-sm text-gold">
              Create the first event
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
          href="/admin/grid/new"
          className="flex shrink-0 items-center gap-1 rounded-[var(--radius)] border border-border px-3 py-2 text-xs text-muted hover:text-gold"
        >
          <Plus className="size-3.5" aria-hidden />
          New
        </Link>
      </div>
      <StationClient eventId={selected.id} eventName={selected.name} jouleValue={selected.joule_value} />
    </div>
  );
}
