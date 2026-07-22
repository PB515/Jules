'use server';

import { randomBytes } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireAdmin } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { getStudentActivitySummary } from '@/lib/jules/student-activity';

export interface ActionResult {
  error?: string;
  tempPassword?: string;
}

/**
 * The same "My activity" breakdown shown on the student's own Profile page
 * (event attendance, Joules by source, quiz participation), fetched
 * on-demand per row rather than for every student up front. Relies on the
 * existing staff-wide SELECT policies on event_registrations/
 * joule_transactions — no new RPC needed, same reasoning as the Profile page.
 */
export async function getStudentActivityForVaultAction(studentId: string) {
  await requireAdmin(['super_admin']);
  const supabase = await createClient();
  const summary = await getStudentActivitySummary(supabase, studentId);
  return {
    attendance: summary.attendance,
    pointsBySource: Object.fromEntries(summary.pointsBySource),
    soloQuizCount: summary.soloQuizCount,
    groupQuizCount: summary.groupQuizCount,
  };
}

/**
 * Force Reset (spec §7) — Owner only, instantly issues a temporary password.
 * Uses the service-role client (Auth Admin API) because setting an arbitrary
 * password requires it; the audit log write also goes through service-role
 * since it's a trusted server-only context, never a client-reachable insert.
 *
 * The Auth Admin API operates on ANY auth.users row, students or admins —
 * unlike admin_adjust_joules/admin_set_student_status, it isn't naturally
 * scoped by a foreign key to `students`. Without this check, an Owner could
 * pass another admin's (even another Owner's) id as "studentId" and silently
 * reset their password through this feature — no distinct audit trail from
 * a real student reset, and no functional barrier stopping it. Confirmed
 * during a security retrospective; this check is the fix.
 */
export async function forceResetAction(studentId: string): Promise<ActionResult> {
  const admin = await requireAdmin(['super_admin']);
  const supabase = await createClient();
  const { data: student } = await supabase.from('students').select('id').eq('id', studentId).maybeSingle();
  if (!student) return { error: 'That account is not a student. Force Reset only applies to students.' };

  const service = createServiceRoleClient();
  const tempPassword = randomBytes(9).toString('base64url');
  const { error } = await service.auth.admin.updateUserById(studentId, { password: tempPassword });
  if (error) return { error: error.message };

  await service.from('audit_log_entries').insert({
    admin_id: admin.id,
    action: 'force_reset',
    target_student_id: studentId,
    details: {},
  });

  revalidatePath('/admin/vault');
  return { tempPassword };
}

export async function adjustJoulesAction(studentId: string, amount: number, reason: string): Promise<ActionResult> {
  await requireAdmin(['super_admin']);
  if (!Number.isFinite(amount) || amount === 0) return { error: 'Enter a non-zero amount.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_adjust_joules', {
    p_student_id: studentId,
    p_amount: Math.round(amount),
    p_reason: reason || 'manual adjustment',
  });
  if (error) return { error: error.message };
  revalidatePath('/admin/vault');
  return {};
}

export async function setStudentStatusAction(studentId: string, status: 'active' | 'locked'): Promise<ActionResult> {
  await requireAdmin(['super_admin']);
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_student_status', { p_student_id: studentId, p_status: status });
  if (error) return { error: error.message };
  revalidatePath('/admin/vault');
  return {};
}
