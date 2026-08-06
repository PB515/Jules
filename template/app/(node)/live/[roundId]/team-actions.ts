'use server';

import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

// All three actions return { error } instead of throwing. Next.js sanitizes
// any Error thrown out of a Server Action in production builds — the real
// message never reaches the client, replaced with a generic digest-only
// placeholder ("An error occurred in the Server Components render...").
// These RPCs already raise genuinely helpful, safe-to-show messages (e.g.
// "this round has already started — teams can only be formed beforehand"
// when a student's stale team-formation screen tries to act on a round the
// host has since started) — throwing them away instead of returning them
// was a real, confusing bug live-reported by the user, not a hypothetical
// one. Same systemic gotcha already hit once in this project for a
// different reason (decision 83, Server Action body-size errors).
type ActionResult = { error?: string };

export async function createLiveTeamAction(roundId: string, roomCode: string, teamName: string): Promise<ActionResult> {
  await requireStudent();
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_live_team', { p_room_code: roomCode, p_team_name: teamName });
  if (error) return { error: error.message };
  revalidatePath(`/live/${roundId}`);
  return {};
}

export async function joinLiveTeamAction(roundId: string, teamId: string): Promise<ActionResult> {
  await requireStudent();
  const supabase = await createClient();
  const { error } = await supabase.rpc('join_live_team', { p_team_id: teamId });
  if (error) return { error: error.message };
  revalidatePath(`/live/${roundId}`);
  return {};
}

export async function leaveLiveTeamAction(roundId: string, teamId: string): Promise<ActionResult> {
  await requireStudent();
  const supabase = await createClient();
  const { error } = await supabase.rpc('leave_live_team', { p_team_id: teamId });
  if (error) return { error: error.message };
  revalidatePath(`/live/${roundId}`);
  return {};
}
