'use server';

import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export interface ActionResult {
  error?: string;
}

export async function joinLiveRoundAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireStudent();
  const roomCode = String(formData.get('room_code') ?? '').trim();
  const teamName = String(formData.get('team_name') ?? '').trim();
  if (!roomCode || !teamName) return { error: 'Enter the room code and a team name.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('join_live_round', { p_room_code: roomCode, p_team_name: teamName });
  if (error || !data) return { error: error?.message ?? 'Could not join that room.' };

  redirect(`/live/${data.round_id}`);
}
