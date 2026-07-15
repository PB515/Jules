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
  await requireAdmin(['professor']);
  const cleaned = domains.map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (cleaned.length === 0) return { error: 'At least one domain is required.' };

  const supabase = await createClient();
  const { error } = await supabase.from('institution_settings').update({ allowed_domains: cleaned }).eq('id', true);
  if (error) return { error: error.message };
  revalidatePath('/admin/settings');
  return {};
}

export async function createSeasonAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['professor']);
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
  await requireAdmin(['professor']);
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? '') as AdminRole;
  const clubId = String(formData.get('club_id') ?? '') || null;

  if (!name || !email || !role) return { error: 'Fill in name, email, and role.' };
  if (!['professor', 'committee_member'].includes(role)) return { error: 'Invalid role.' };
  if (role === 'committee_member' && !clubId) return { error: 'Pick the club this Committee Member belongs to.' };

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
    p_club_id: role === 'committee_member' ? clubId : null,
  });
  if (rpcErr) return { error: rpcErr.message };

  revalidatePath('/admin/settings');
  return { tempPassword };
}

export async function setAdminRoleAction(adminId: string, role: AdminRole, clubId: string | null) {
  await requireAdmin(['professor']);
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_role', {
    p_admin_id: adminId,
    p_role: role,
    p_club_id: role === 'committee_member' ? clubId : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/settings');
}

export interface BulkStudentRow {
  name: string;
  email: string;
  tempPassword?: string;
  error?: string;
}
export interface BulkStudentResult {
  error?: string;
  results?: BulkStudentRow[];
}

/**
 * Bulk-provisions student accounts directly (no self-signup expected — the
 * institution pre-creates all 300+ accounts and hands out credentials via a
 * CSV, confirmed with the user). Each line is "Name, email"; per line this
 * mirrors createAdminAction's own pattern (service-role createUser for the
 * auth account, then the profile row) rather than complete_onboarding(),
 * which only ever runs in the new user's OWN auth.uid() context — an admin
 * acting on someone else's behalf has no such context to use.
 */
export async function bulkCreateStudentsAction(_prev: BulkStudentResult, formData: FormData): Promise<BulkStudentResult> {
  await requireAdmin(['professor']);
  const raw = String(formData.get('roster') ?? '').trim();
  if (!raw) return { error: 'Paste at least one name and email, one per line.' };

  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length > 500) return { error: 'Paste 500 or fewer at a time.' };

  const supabase = await createClient();
  const service = createServiceRoleClient();
  const results: BulkStudentRow[] = [];

  for (const line of lines) {
    const [namePart, emailPart] = line.split(',').map((s) => s?.trim());
    const name = namePart ?? '';
    const email = (emailPart ?? '').toLowerCase();
    if (!name || !email) {
      results.push({ name: namePart ?? '', email: emailPart ?? '', error: 'Expected "Name, email" per line.' });
      continue;
    }

    const { data: allowed } = await supabase.rpc('is_email_domain_allowed', { p_email: email });
    if (!allowed) {
      results.push({ name, email, error: 'Email domain not in the allowed list.' });
      continue;
    }

    const tempPassword = randomBytes(9).toString('base64url');
    const { data: created, error: createErr } = await service.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      results.push({ name, email, error: createErr?.message ?? 'Could not create account.' });
      continue;
    }

    const { error: insertErr } = await service.from('students').insert({
      id: created.user.id,
      name,
      college_email: email,
    });
    if (insertErr) {
      results.push({ name, email, error: insertErr.message });
      continue;
    }

    results.push({ name, email, tempPassword });
  }

  revalidatePath('/admin/settings');
  return { results };
}

export async function createClubAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['professor']);
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

export async function updateClubSocialLinksAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['professor']);
  const clubId = String(formData.get('club_id') ?? '');
  const instagramUrl = String(formData.get('instagram_url') ?? '').trim();
  const linkedinUrl = String(formData.get('linkedin_url') ?? '').trim();
  const xUrl = String(formData.get('x_url') ?? '').trim();

  if (!clubId) return { error: 'Missing club.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('clubs')
    .update({
      instagram_url: instagramUrl || null,
      linkedin_url: linkedinUrl || null,
      x_url: xUrl || null,
    })
    .eq('id', clubId);
  if (error) return { error: error.message };

  revalidatePath('/admin/settings');
  return {};
}
