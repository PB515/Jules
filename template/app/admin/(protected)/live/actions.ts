'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export interface ActionResult {
  error?: string;
}

export async function createLiveRoundAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['professor', 'committee_member']);
  const surgeId = String(formData.get('surge_id') ?? '');
  if (!surgeId) return { error: 'Pick a Surge to host.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('host_create_round', { p_surge_id: surgeId });
  if (error || !data) return { error: error?.message ?? 'Could not start the round.' };

  redirect(`/admin/live/${data.id}`);
}

export async function advanceRoundAction(roundId: string) {
  await requireAdmin(['professor', 'committee_member']);
  const supabase = await createClient();
  const { error } = await supabase.rpc('host_advance_round', { p_round_id: roundId });
  if (error) throw new Error(error.message);
}
