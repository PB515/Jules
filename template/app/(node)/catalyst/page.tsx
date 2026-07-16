import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { SeasonPicker } from './season-picker';
import { EmptyState } from '@/lib/patterns/empty-state';
import { Trophy } from '@/lib/icons';

export const metadata = { title: 'Catalyst Records' };

const PAGE_SIZE = 50;

export default async function CatalystPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; page?: string }>;
}) {
  const student = await requireStudent();
  const { season: seasonParam, page: pageParam } = await searchParams;
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

  // Only worth letting a student switch seasons once 2+ of them actually have
  // real activity — with a fresh install (or only the placeholder calendar,
  // decision 9) there's usually exactly one season anyone has ever earned a
  // Joule in, and a dropdown with nothing meaningful behind the other option
  // reads as clutter, not a useful control.
  const activityCounts = await Promise.all(
    seasons.map(async (s) => {
      const { count } = await supabase
        .from('joule_transactions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', s.start_date)
        .lte('created_at', s.end_date);
      return (count ?? 0) > 0;
    })
  );
  const seasonsWithActivity = activityCounts.filter(Boolean).length;
  const showPicker = seasonsWithActivity > 1;

  const now = new Date();
  const activeSeason = seasons.find((s) => now >= new Date(s.start_date) && now <= new Date(s.end_date));
  const defaultSeasonId = activeSeason?.id ?? seasons[0].id;
  const selectedId = seasonParam ?? defaultSeasonId;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { data: leaderboard } = await supabase.rpc('season_leaderboard', {
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
    <div className="flex flex-col gap-6 px-5 pt-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted">Permanent archive</p>
        <h1 className="text-xl font-medium">Catalyst Records</h1>
      </div>

      {showPicker ? (
        <SeasonPicker seasons={seasons.map((s) => ({ id: s.id, label: s.label }))} selected={selectedId} />
      ) : null}

      {/* Static — no reveal animation (spec §6): a settled record, not a live moment. */}
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
                className={`flex items-center justify-between rounded-[var(--radius)] border px-4 py-3 ${
                  row.student_id === student.id ? 'border-gold' : 'border-border'
                } bg-card`}
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
                <Link href={`/catalyst?season=${selectedId}&page=${page - 1}`} className="text-gold">
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              {hasNext ? (
                <Link href={`/catalyst?season=${selectedId}&page=${page + 1}`} className="text-gold">
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
