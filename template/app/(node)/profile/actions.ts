'use server';

import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function updateProfile(patch: { name: string; phone: string }) {
  const student = await requireStudent();
  const supabase = await createClient();
  const { error } = await supabase
    .from('students')
    .update({ name: patch.name.trim(), phone: patch.phone.trim() })
    .eq('id', student.id);
  if (error) throw new Error(error.message);
  revalidatePath('/profile');
}

export interface ChangePasswordResult {
  error?: string;
  success?: boolean;
}

/**
 * Self-service password change from an already-authenticated session — the
 * other half of "no self-signup" (decision: students still own their own
 * credential going forward, they just don't create the account itself).
 * Same validation as the email-link reset flow (resetPasswordAction in
 * app/(auth)/actions.ts), no separate "current password" re-entry required
 * since Supabase's own session is already the proof of identity here.
 */
export async function changePasswordAction(_prev: ChangePasswordResult, formData: FormData): Promise<ChangePasswordResult> {
  await requireStudent();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
  if (password !== confirm) return { error: "Passwords don't match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { success: true };
}
