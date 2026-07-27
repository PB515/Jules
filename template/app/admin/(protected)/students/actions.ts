'use server';

import { randomBytes } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireAdmin } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

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
 * institution pre-creates all accounts and hands out credentials via a CSV,
 * confirmed with the user). Each line is "Name, email"; per line this
 * mirrors createAdminAction's own pattern (service-role createUser for the
 * auth account, then the profile row) rather than complete_onboarding(),
 * which only ever runs in the new user's OWN auth.uid() context — an admin
 * acting on someone else's behalf has no such context to use.
 *
 * Relocated from settings/actions.ts (formerly bulkCreateStudentsAction) —
 * logic is unchanged, only the route moved, since the flow was buried as
 * one section on an already-dense Institution Settings page.
 */
export async function bulkCreateStudentsAction(_prev: BulkStudentResult, formData: FormData): Promise<BulkStudentResult> {
  await requireAdmin(['super_admin']);
  const raw = String(formData.get('roster') ?? '').trim();
  if (!raw) return { error: 'Paste or upload at least one name and email, one per line.' };

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

  revalidatePath('/admin/students');
  return { results };
}
