import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { ScopePicker } from './scope-picker';
import { ReportButtons } from './report-buttons';

export const metadata = { title: 'Reports' };

/**
 * The actual gap against the Dean's stated top priority — row-level,
 * Power-BI-ready exports across a real term/club, not another dashboard.
 * A club-scoped Professor/Committee Member never sees the club picker at
 * all (they're already locked to their own club server-side regardless);
 * Super Admin can narrow to one club or leave it as "All clubs."
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; club?: string }>;
}) {
  const admin = await requireAdmin(['professor', 'committee_member', 'super_admin']);
  const { season, club } = await searchParams;
  const supabase = await createClient();

  const [{ data: seasons }, { data: clubs }] = await Promise.all([
    supabase.from('seasons').select('id, label').order('start_date', { ascending: false }),
    admin.role === 'super_admin' ? supabase.from('clubs').select('id, name').order('name') : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-medium">Reports</h1>
        <p className="mt-1 text-xs text-tertiary">
          Row-level CSV exports, ready to drop into Excel or Power BI, one file per table, not one pre-aggregated
          sheet.
        </p>
      </div>

      <ScopePicker
        seasons={seasons ?? []}
        clubs={clubs ?? []}
        selectedSeason={season ?? ''}
        selectedClub={club ?? ''}
        isSuperAdmin={admin.role === 'super_admin'}
      />

      <ReportButtons scope={{ seasonId: season ?? null, clubId: admin.role === 'super_admin' ? (club ?? null) : null }} />
    </div>
  );
}
