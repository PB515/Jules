import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/lib/patterns/empty-state';
import { EventCoverPlaceholder } from '@/lib/components/event-cover-placeholder';
import { Users } from '@/lib/icons';

export const metadata = { title: 'Clubs' };

export default async function ClubsPage() {
  const supabase = await createClient();
  const { data: clubs } = await supabase.rpc('public_clubs');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-medium">Clubs</h1>
        <p className="mt-1 text-sm text-muted">Every club running events, quizzes, and Surges on Synergy.</p>
      </div>

      {!clubs || clubs.length === 0 ? (
        <EmptyState icon={Users} title="No clubs yet" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((c) => (
            <Link
              key={c.id}
              href={`/clubs/${c.slug}`}
              className="flex flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-card transition-colors hover:border-gold/50"
            >
              <div className="flex aspect-video items-center justify-center bg-background">
                <EventCoverPlaceholder className="h-full w-full" />
              </div>
              <div className="flex flex-col gap-1 p-4">
                <p className="text-sm font-medium">{c.name}</p>
                {c.description ? <p className="text-xs text-tertiary">{c.description}</p> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
