'use server';

import { randomBytes } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireAdmin } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export interface ActionResult {
  error?: string;
  tempPassword?: string;
}

/**
 * Force Reset (spec §7) — Owner only, instantly issues a temporary password.
 * Uses the service-role client (Auth Admin API) because setting an arbitrary
 * password requires it; the audit log write also goes through service-role
 * since it's a trusted server-only context, never a client-reachable insert.
 */
export async function forceResetAction(studentId: string): Promise<ActionResult> {
  const admin = await requireAdmin(['owner']);
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
  await requireAdmin(['owner']);
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
  await requireAdmin(['owner']);
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_student_status', { p_student_id: studentId, p_status: status });
  if (error) return { error: error.message };
  revalidatePath('/admin/vault');
  return {};
}
