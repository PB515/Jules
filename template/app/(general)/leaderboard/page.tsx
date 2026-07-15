import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SeasonPicker } from './season-picker';
import { EmptyState } from '@/lib/patterns/empty-state';
import { Trophy } from '@/lib/icons';

export const metadata = { title: 'Leaderboard' };

const PAGE_SIZE = 50;

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; page?: string }>;
}) {
  const { season: seasonParam, page: pageParam } = await searchParams;
  const supabase = await createClient();

  const { data: seasons } = await supabase.rpc('public_seasons');

  if (!seasons || seasons.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-medium">Leaderboard</h1>
        <EmptyState icon={Trophy} title="No seasons yet" />
      </div>
    );
  }

  const selectedId = seasonParam ?? seasons[0].id;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { data: leaderboard } = await supabase.rpc('public_season_leaderboard', {
    p_season_id: selectedId,
    p_limit: PAGE_SIZE,
    p_offset: offset,
  });
  const rows = leaderboard ?? [];
  const totalCount = rows[0]?.total_count ?? 0;
  const rangeStart = rows.length > 0 ? offset + 1 : 0;
  const rangeEnd = offset + rows.length;
  const hasPrev = page > 1;
  const hasNext = rangeEnd < totalCount;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-medium">Leaderboard</h1>
        <p className="mt-1 text-sm text-muted">Every student, ranked by season Joules.</p>
      </div>

      <SeasonPicker seasons={seasons.map((s) => ({ id: s.id, label: s.label }))} selected={selectedId} />

      {rows.length === 0 ? (
        <EmptyState icon={Trophy} title="No students yet" />
      ) : (
        <>
          <p className="text-xs text-tertiary">
            {rangeStart}–{rangeEnd} of {totalCount} students
          </p>
          <ol className="flex flex-col gap-2">
            {rows.map((row) => (
              <li
                key={row.student_id}
                className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 text-center text-sm font-medium text-tertiary">#{row.rank}</span>
                  <span className="text-sm">{row.name}</span>
                </div>
                <span className="text-sm font-medium text-gold">{row.total_amount} J</span>
              </li>
            ))}
          </ol>

          {hasPrev || hasNext ? (
            <div className="flex items-center justify-between text-sm">
              {hasPrev ? (
                <Link href={`/leaderboard?season=${selectedId}&page=${page - 1}`} className="text-gold">
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              {hasNext ? (
                <Link href={`/leaderboard?season=${selectedId}&page=${page + 1}`} className="text-gold">
                  Next →
                </Link>
              ) : (
                <span />
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
