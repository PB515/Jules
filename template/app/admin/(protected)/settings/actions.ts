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
  await requireAdmin(['super_admin']);
  const cleaned = domains.map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (cleaned.length === 0) return { error: 'At least one domain is required.' };

  const supabase = await createClient();
  const { error } = await supabase.from('institution_settings').update({ allowed_domains: cleaned }).eq('id', true);
  if (error) return { error: error.message };
  revalidatePath('/admin/settings');
  return {};
}

export async function createSeasonAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['super_admin']);
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
 * roster row via the Professor-gated, audit-logged RPC.
 */
export async function createAdminAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['super_admin']);
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? '') as AdminRole;
  const clubId = String(formData.get('club_id') ?? '') || null;

  const customPassword = String(formData.get('password') ?? '').trim();

  if (!name || !email || !role) return { error: 'Fill in name, email, and role.' };
  if (!['super_admin', 'professor', 'committee_member'].includes(role)) return { error: 'Invalid role.' };
  if ((role === 'professor' || role === 'committee_member') && !clubId) {
    return { error: `Pick the club this ${role === 'professor' ? 'Professor' : 'Committee Member'} belongs to.` };
  }
  if (customPassword && customPassword.length < 8) return { error: 'Password must be at least 8 characters.' };

  const service = createServiceRoleClient();
  // A chosen password lets a real Professor/Committee Member's login be
  // something simple enough to relay over WhatsApp and remember, rather
  // than a copy-paste-only random string — the email itself doesn't need
  // to be a real deliverable inbox either (admin-created accounts are
  // always email_confirm: true, so nothing is ever sent to it).
  const tempPassword = customPassword || randomBytes(9).toString('base64url');
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
    p_club_id: role === 'professor' || role === 'committee_member' ? clubId : null,
  });
  if (rpcErr) return { error: rpcErr.message };

  revalidatePath('/admin/settings');
  return { tempPassword };
}

export async function setAdminRoleAction(adminId: string, role: AdminRole, clubId: string | null) {
  await requireAdmin(['super_admin']);
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_role', {
    p_admin_id: adminId,
    p_role: role,
    p_club_id: role === 'professor' || role === 'committee_member' ? clubId : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/settings');
}

// Bulk student account creation (formerly bulkCreateStudentsAction here)
// moved to app/admin/(protected)/students/actions.ts — its own Command
// Center tab now, not a section on this page.

export async function createClubAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['super_admin']);
  const name = String(formData.get('name') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const description = String(formData.get('description') ?? '').trim();

  if (!name || !slug) return { error: 'Fill in a name and slug.' };
  if (!/^[a-z0-9-]+$/.test(slug)) return { error: 'Slug can only contain lowercase letters, numbers, and hyphens.' };

  const supabase = await createClient();
  const { error } = await supabase.from('clubs').insert({ name, slug, description: description || null });
  if (error) return { error: error.message };

  revalidatePath('/admin/settings');
  return {};
}

export async function updateClubDetailsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['super_admin']);
  const clubId = String(formData.get('club_id') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  const mentorName = String(formData.get('mentor_name') ?? '').trim();
  const instagramUrl = String(formData.get('instagram_url') ?? '').trim();
  const linkedinUrl = String(formData.get('linkedin_url') ?? '').trim();
  const xUrl = String(formData.get('x_url') ?? '').trim();
  const gain = formData.getAll('gain').map((g) => String(g).trim()).filter(Boolean);
  const activities = formData.getAll('activities').map((a) => String(a).trim()).filter(Boolean);

  if (!clubId) return { error: 'Missing club.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('clubs')
    .update({
      description: description || null,
      mentor_name: mentorName || null,
      instagram_url: instagramUrl || null,
      linkedin_url: linkedinUrl || null,
      x_url: xUrl || null,
      gain,
      activities,
    })
    .eq('id', clubId);
  if (error) return { error: error.message };

  revalidatePath('/admin/settings');
  return {};
}
