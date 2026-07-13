'use server';

import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function createGroupAction(surgeId: string, name: string) {
  await requireStudent();
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_quiz_group', { p_surge_id: surgeId, p_name: name });
  if (error) throw new Error(error.message);
  revalidatePath(`/surge/${surgeId}`);
}

export async function joinGroupAction(surgeId: string, groupId: string) {
  await requireStudent();
  const supabase = await createClient();
  const { error } = await supabase.rpc('join_quiz_group', { p_group_id: groupId });
  if (error) throw new Error(error.message);
  revalidatePath(`/surge/${surgeId}`);
}

export async function leaveGroupAction(surgeId: string, groupId: string) {
  await requireStudent();
  const supabase = await createClient();
  const { error } = await supabase.rpc('leave_quiz_group', { p_group_id: groupId });
  if (error) throw new Error(error.message);
  revalidatePath(`/surge/${surgeId}`);
}
