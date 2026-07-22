import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { EmptyState } from '@/lib/patterns/empty-state';
import { Zap, Plus } from '@/lib/icons';

export const metadata = { title: 'Surge Builder' };

const STATUS_STYLE: Record<string, string> = {
  draft: 'text-tertiary border-border',
  live: 'text-gold border-gold',
  complete: 'text-muted border-border',
};

export default async function SurgesListPage() {
  const admin = await requireAdmin(['professor', 'committee_member', 'super_admin']);
  const supabase = await createClient();
  // A club-scoped Professor/Committee Member only sees their own club's
  // Surges; a Super Admin sees every club's.
  let query = supabase.from('surges').select('id, name, status, created_at').order('created_at', { ascending: false });
  if ((admin.role === 'professor' || admin.role === 'committee_member') && admin.club_id) {
    query = query.eq('club_id', admin.club_id);
  }
  const { data: surges } = await query;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-medium">Surges</h1>
        <Link
          href="/admin/surges/new"
          className="flex items-center gap-1.5 rounded-[var(--radius)] bg-gold px-3 py-2 text-xs font-medium text-gold-foreground"
        >
          <Plus className="size-3.5" aria-hidden />
          New Surge
        </Link>
      </div>

      {!surges || surges.length === 0 ? (
        <EmptyState icon={Zap} title="No Surges yet" message="Create one to start building questions." />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
          {surges.map((s) => (
            <li key={s.id}>
              <Link href={`/admin/surges/${s.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-background">
                <span className="text-sm">{s.name}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[s.status]}`}>{s.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
