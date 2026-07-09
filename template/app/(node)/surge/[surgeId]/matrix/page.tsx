import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { EmptyState } from '@/lib/patterns/empty-state';
import { Trophy } from '@/lib/icons';
import { MatrixClient } from './matrix-client';

export const metadata = { title: 'Surge Matrix' };

export default async function MatrixPage({ params }: { params: Promise<{ surgeId: string }> }) {
  const student = await requireStudent();
  const { surgeId } = await params;
  const supabase = await createClient();

  const { data: surge } = await supabase.from('surges').select('*').eq('id', surgeId).maybeSingle();
  if (!surge) {
    return (
      <div className="px-5 pt-8">
        <EmptyState icon={Trophy} title="Surge not found" />
      </div>
    );
  }

  if (surge.status !== 'complete') {
    return (
      <div className="px-5 pt-8">
        <EmptyState
          icon={Trophy}
          title="Results are still charging up"
          message="The Surge Matrix reveals once this Surge closes. Check back shortly."
        />
      </div>
    );
  }

  const { data: leaderboard } = await supabase.rpc('surge_leaderboard', { p_surge_id: surgeId });
  const rows = leaderboard ?? [];
  const top10 = rows.slice(0, 10);
  const mine = rows.find((r) => r.student_id === student.id) ?? null;
  const { data: totalsRows } = await supabase.rpc('my_totals');
  const myTier = totalsRows?.[0]?.tier ?? 'ember';

  return (
    <div className="flex flex-col gap-6 px-5 pt-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted">{surge.name}</p>
        <h1 className="text-xl font-medium">Surge Matrix</h1>
      </div>
      <MatrixClient top10={top10} mine={mine} myTier={myTier} />
    </div>
  );
}
