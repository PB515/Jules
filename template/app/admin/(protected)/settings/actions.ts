'use server';

import { randomBytes } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireAdmin } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import type { AdminRole } from '@/lib/supabase/database.types';

export interface ActionResult {
  error?: string;
  tempPassword?: string;
}

export async function updateAllowedDomainsAction(domains: string[]): Promise<ActionResult> {
  await requireAdmin(['owner']);
  const cleaned = domains.map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (cleaned.length === 0) return { error: 'At least one domain is required.' };

  const supabase = await createClient();
  const { error } = await supabase.from('institution_settings').update({ allowed_domains: cleaned }).eq('id', true);
  if (error) return { error: error.message };
  revalidatePath('/admin/settings');
  return {};
}

export async function createSeasonAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['owner']);
  const label = String(formData.get('label') ?? '').trim();
  const startDate = String(formData.get('start_date') ?? '');
  const endDate = String(formData.get('end_date') ?? '');
  const cadence = String(formData.get('cadence') ?? 'custom');

  if (!label || !startDate || !endDate) return { error: 'Fill in label, start, and end dates.' };
  if (new Date(endDate) <= new Date(startDate)) return { error: 'End date must be after start date.' };

  const supabase = await createClient();
  const { error } = await supabase.from('seasons').insert({
    label,
    start_date: startDate,
    end_date: endDate,
    cadence: cadence as 'semester' | 'trimester' | 'annual' | 'custom',
  });
  if (error) return { error: error.message };
  revalidatePath('/admin/settings');
  return {};
}

/**
 * Creates a new admin: an auth user via the service-role Admin API (roster
 * signup isn't self-serve — spec has no admin-signup flow), then the admins
 * roster row via the owner-gated, audit-logged RPC.
 */
export async function createAdminAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['owner']);
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? '') as AdminRole;
  const volunteerEventId = String(formData.get('volunteer_event_id') ?? '') || null;

  if (!name || !email || !role) return { error: 'Fill in name, email, and role.' };
  if (!['owner', 'officer', 'volunteer'].includes(role)) return { error: 'Invalid role.' };
  if (role === 'volunteer' && !volunteerEventId) return { error: 'Pick the event this volunteer is scoped to.' };

  const service = createServiceRoleClient();
  const tempPassword = randomBytes(9).toString('base64url');
  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createErr || !created.user) return { error: createErr?.message ?? 'Could not create the account.' };

  const supabase = await createClient();
  const { error: rpcErr } = await supabase.rpc('admin_create_admin', {
    p_user_id: created.user.id,
    p_name: name,
    p_email: email,
    p_role: role,
    p_volunteer_event_id: volunteerEventId,
  });
  if (rpcErr) return { error: rpcErr.message };

  revalidatePath('/admin/settings');
  return { tempPassword };
}

export async function setAdminRoleAction(adminId: string, role: AdminRole, volunteerEventId: string | null) {
  await requireAdmin(['owner']);
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_role', {
    p_admin_id: adminId,
    p_role: role,
    p_volunteer_event_id: volunteerEventId,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/settings');
}
