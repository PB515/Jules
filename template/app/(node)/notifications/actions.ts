'use server';

import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function markNotificationReadAction(id: string) {
  await requireStudent();
  const supabase = await createClient();
  const { error } = await supabase.rpc('mark_notification_read', { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath('/notifications');
  revalidatePath('/dashboard');
}
