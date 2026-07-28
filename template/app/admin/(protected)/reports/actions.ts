'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';

interface Scope {
  seasonId: string | null;
  clubId: string | null;
}

async function scoped() {
  await requireAdmin(['professor', 'committee_member', 'super_admin']);
  return createClient();
}

export async function fetchStudentsReportAction({ seasonId, clubId }: Scope) {
  const supabase = await scoped();
  const { data, error } = await supabase.rpc('report_students', { p_season_id: seasonId, p_club_id: clubId });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchEventsReportAction({ seasonId, clubId }: Scope) {
  const supabase = await scoped();
  const { data, error } = await supabase.rpc('report_events', { p_season_id: seasonId, p_club_id: clubId });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAttendanceReportAction({ seasonId, clubId }: Scope) {
  const supabase = await scoped();
  const { data, error } = await supabase.rpc('report_attendance', { p_season_id: seasonId, p_club_id: clubId });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchQuizReportAction({ seasonId, clubId }: Scope) {
  const supabase = await scoped();
  const { data, error } = await supabase.rpc('report_quiz_participation', { p_season_id: seasonId, p_club_id: clubId });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchJouleLedgerReportAction({ seasonId, clubId }: Scope) {
  const supabase = await scoped();
  const { data, error } = await supabase.rpc('report_joule_ledger', { p_season_id: seasonId, p_club_id: clubId });
  if (error) throw new Error(error.message);
  return data ?? [];
}
