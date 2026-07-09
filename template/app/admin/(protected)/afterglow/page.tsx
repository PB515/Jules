import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { EmptyState } from '@/lib/patterns/empty-state';
import { BookOpen, Plus } from '@/lib/icons';

export const metadata = { title: 'Afterglow' };

export default async function AdminAfterglowListPage() {
  await requireAdmin(['owner', 'officer']);
  const supabase = await createClient();
  const [{ data: posts }, { data: events }] = await Promise.all([
    supabase.from('afterglow_posts').select('id, title, created_at, event_id').order('created_at', { ascending: false }),
    supabase.from('events').select('id, name'),
  ]);
  const eventNames = new Map((events ?? []).map((e) => [e.id, e.name]));

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-medium">Afterglow</h1>
        <Link
          href="/admin/afterglow/new"
          className="flex items-center gap-1.5 rounded-[var(--radius)] bg-gold px-3 py-2 text-xs font-medium text-gold-foreground"
        >
          <Plus className="size-3.5" aria-hidden />
          New write-up
        </Link>
      </div>

      {!posts || posts.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nothing written yet" message="Write a recap of a past event for the public site." />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
          {posts.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm">{p.title}</p>
                <p className="text-xs text-tertiary">{eventNames.get(p.event_id)}</p>
              </div>
              <span className="text-xs text-tertiary">
                {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
