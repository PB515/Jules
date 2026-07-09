import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/lib/patterns/empty-state';
import { BookOpen } from '@/lib/icons';

export const metadata = { title: 'Afterglow' };

export default async function AfterglowListPage() {
  const supabase = await createClient();
  // Two separate public reads, not an embedded `events(...)` join — `events`
  // itself has no public SELECT policy (only public_events() is exposed, and
  // only with safe columns), so an embedded join would silently return null
  // event names for anonymous visitors instead of a real name.
  const [{ data: posts }, { data: events }] = await Promise.all([
    supabase.from('afterglow_posts').select('id, title, created_at, event_id').order('created_at', { ascending: false }),
    supabase.rpc('public_events'),
  ]);
  const eventNames = new Map((events ?? []).map((e) => [e.id, e.name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-medium">Afterglow</h1>
        <p className="mt-1 text-sm text-muted">What happened, in the club&apos;s own words, after the energy settles.</p>
      </div>

      {!posts || posts.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nothing written yet" message="Recaps of past events will appear here." />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/afterglow/${p.id}`} className="flex items-center justify-between px-4 py-4 hover:bg-background">
                <div>
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="mt-0.5 text-xs text-tertiary">{eventNames.get(p.event_id)}</p>
                </div>
                <p className="text-xs text-muted">
                  {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
