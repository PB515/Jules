import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { SeasonPicker } from './season-picker';
import { EmptyState } from '@/lib/patterns/empty-state';
import { Trophy } from '@/lib/icons';

export const metadata = { title: 'Catalyst Records' };

export default async function CatalystPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const student = await requireStudent();
  const { season: seasonParam } = await searchParams;
  const supabase = await createClient();

  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, label, start_date, end_date')
    .order('start_date', { ascending: false });

  if (!seasons || seasons.length === 0) {
    return (
      <div className="px-5 pt-8">
        <EmptyState icon={Trophy} title="No seasons yet" />
      </div>
    );
  }

  const selectedId = seasonParam ?? seasons[0].id;
  const { data: leaderboard } = await supabase.rpc('season_leaderboard', { p_season_id: selectedId });
  const rows = leaderboard ?? [];

  return (
    <div className="flex flex-col gap-6 px-5 pt-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted">Permanent archive</p>
        <h1 className="text-xl font-medium">Catalyst Records</h1>
      </div>

      <SeasonPicker seasons={seasons.map((s) => ({ id: s.id, label: s.label }))} selected={selectedId} />

      {/* Static — no reveal animation (spec §6): a settled record, not a live moment. */}
      {rows.length === 0 ? (
        <EmptyState icon={Trophy} title="No Joules recorded" message="Nobody had earned Joules in this season yet." />
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.student_id}
              className={`flex items-center justify-between rounded-[var(--radius)] border px-4 py-3 ${
                row.student_id === student.id ? 'border-gold' : 'border-border'
              } bg-card`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-sm font-medium text-tertiary">#{row.rank}</span>
                <span className="text-sm">{row.name}</span>
              </div>
              <span className="text-sm font-medium text-gold">{row.total_amount} J</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
