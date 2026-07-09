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
