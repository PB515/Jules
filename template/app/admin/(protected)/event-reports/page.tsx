import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { EmptyState } from '@/lib/patterns/empty-state';
import { BookOpen, Plus } from '@/lib/icons';

export const metadata = { title: 'Event Reports' };

export default async function AdminEventReportsListPage() {
  await requireAdmin(['professor', 'committee_member']);
  const supabase = await createClient();
  const [{ data: reports }, { data: events }] = await Promise.all([
    supabase.from('event_reports').select('id, title, created_at, event_id').order('created_at', { ascending: false }),
    supabase.from('events').select('id, name'),
  ]);
  const eventNames = new Map((events ?? []).map((e) => [e.id, e.name]));

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-medium">Event Reports</h1>
        <Link
          href="/admin/event-reports/new"
          className="flex items-center gap-1.5 rounded-[var(--radius)] bg-gold px-3 py-2 text-xs font-medium text-gold-foreground"
        >
          <Plus className="size-3.5" aria-hidden />
          New report
        </Link>
      </div>

      {!reports || reports.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nothing written yet" message="Fill in a report for a past event for the public site." />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
          {reports.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm">{r.title}</p>
                <p className="text-xs text-tertiary">{eventNames.get(r.event_id)}</p>
              </div>
              <span className="text-xs text-tertiary">
                {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
