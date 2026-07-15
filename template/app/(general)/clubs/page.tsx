import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/lib/patterns/empty-state';
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
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
          {clubs.map((c) => (
            <li key={c.id}>
              <Link href={`/clubs/${c.slug}`} className="flex flex-col gap-1 px-4 py-3.5 hover:bg-background">
                <p className="text-sm font-medium">{c.name}</p>
                {c.description ? <p className="text-xs text-tertiary">{c.description}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
