import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TransactionType } from '@/lib/supabase/database.types';

export const SOURCE_LABEL: Record<TransactionType, string> = {
  event_scan: 'Event check-ins',
  surge_earned: 'Surge, earned',
  surge_participation: 'Surge, participation',
  admin_manual_adjustment: 'Manual adjustment',
};

export interface StudentActivitySummary {
  attendance: { attended: number; missed: number; upcoming: number };
  pointsBySource: Map<TransactionType, number>;
  soloQuizCount: number;
  groupQuizCount: number;
}

interface RegistrationAttendanceRow {
  attended_at: string | null;
  events: { event_date: string; end_date: string | null } | null;
}

function hasConcluded(isoDate: string): boolean {
  return new Date(isoDate).getTime() < Date.now();
}

/**
 * The "My activity" breakdown (event attendance, Joules by source, quiz
 * participation) originally built for the student's own Profile page.
 * Shared with the admin Student Data Vault so staff can see the same
 * picture for any student — both read sites rely on the existing staff-wide
 * SELECT policies on `event_registrations`/`joule_transactions` (any
 * committee member or professor already reads the full ledger/registration
 * set, not just their own), so no new RPC was needed.
 */
export async function getStudentActivitySummary(
  supabase: SupabaseClient<Database>,
  studentId: string
): Promise<StudentActivitySummary> {
  const [{ data: registrations }, { data: transactions }, { data: groupMemberships }] = await Promise.all([
    supabase
      .from('event_registrations')
      .select('attended_at, events(event_date, end_date)')
      .eq('student_id', studentId)
      .returns<RegistrationAttendanceRow[]>(),
    supabase.from('joule_transactions').select('type, amount, surge_id').eq('student_id', studentId),
    supabase.from('quiz_group_members').select('surge_id').eq('student_id', studentId),
  ]);

  const attendance = { attended: 0, missed: 0, upcoming: 0 };
  for (const r of registrations ?? []) {
    if (r.attended_at) {
      attendance.attended += 1;
    } else if (r.events && hasConcluded(r.events.end_date ?? r.events.event_date)) {
      attendance.missed += 1;
    } else {
      attendance.upcoming += 1;
    }
  }

  const pointsBySource = new Map<TransactionType, number>();
  for (const t of transactions ?? []) {
    pointsBySource.set(t.type, (pointsBySource.get(t.type) ?? 0) + t.amount);
  }

  const groupSurgeIds = new Set((groupMemberships ?? []).map((g) => g.surge_id));
  const quizSurgeIds = new Set((transactions ?? []).filter((t) => t.surge_id).map((t) => t.surge_id as string));
  let soloQuizCount = 0;
  let groupQuizCount = 0;
  for (const surgeId of quizSurgeIds) {
    if (groupSurgeIds.has(surgeId)) groupQuizCount += 1;
    else soloQuizCount += 1;
  }

  return { attendance, pointsBySource, soloQuizCount, groupQuizCount };
}
