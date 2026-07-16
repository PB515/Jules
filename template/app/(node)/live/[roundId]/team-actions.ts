'use server';

import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function createLiveTeamAction(roundId: string, roomCode: string, teamName: string) {
  await requireStudent();
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_live_team', { p_room_code: roomCode, p_team_name: teamName });
  if (error) throw new Error(error.message);
  revalidatePath(`/live/${roundId}`);
}

export async function joinLiveTeamAction(roundId: string, teamId: string) {
  await requireStudent();
  const supabase = await createClient();
  const { error } = await supabase.rpc('join_live_team', { p_team_id: teamId });
  if (error) throw new Error(error.message);
  revalidatePath(`/live/${roundId}`);
}

export async function leaveLiveTeamAction(roundId: string, teamId: string) {
  await requireStudent();
  const supabase = await createClient();
  const { error } = await supabase.rpc('leave_live_team', { p_team_id: teamId });
  if (error) throw new Error(error.message);
  revalidatePath(`/live/${roundId}`);
}
