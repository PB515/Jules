'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { ParsedRow } from '@/lib/jules/csv';
import type { TablesUpdate } from '@/lib/supabase/database.types';

export interface ActionResult {
  error?: string;
}

export async function createSurgeAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['professor', 'committee_member']);
  const name = String(formData.get('name') ?? '').trim();
  const clubId = String(formData.get('club_id') ?? '');
  const points = parseInt(String(formData.get('points_per_question') ?? '20'), 10);
  const participationPoints = parseInt(String(formData.get('participation_points_per_question') ?? '5'), 10);
  const negativePoints = parseInt(String(formData.get('negative_points_per_wrong_answer') ?? '0'), 10);
  if (!name) return { error: 'Name is required.' };
  if (!clubId) return { error: 'Pick the club this Surge belongs to.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('id')
    .lte('start_date', new Date().toISOString())
    .gte('end_date', new Date().toISOString())
    .maybeSingle();

  const { data, error } = await supabase
    .from('surges')
    .insert({
      name,
      club_id: clubId,
      points_per_question: Number.isFinite(points) && points > 0 ? points : 20,
      participation_points_per_question: Number.isFinite(participationPoints) && participationPoints >= 0 ? participationPoints : 5,
      negative_points_per_wrong_answer: Number.isFinite(negativePoints) && negativePoints >= 0 ? negativePoints : 0,
      season_id: activeSeason?.id ?? null,
      created_by: user?.id,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  redirect(`/admin/surges/${data.id}`);
}

export async function updateSurgeScoringAction(
  surgeId: string,
  scoring: { points_per_question: number; participation_points_per_question: number; negative_points_per_wrong_answer: number }
) {
  await requireAdmin(['professor', 'committee_member']);
  const supabase = await createClient();
  const { error } = await supabase
    .from('surges')
    .update({
      points_per_question: scoring.points_per_question,
      participation_points_per_question: scoring.participation_points_per_question,
      negative_points_per_wrong_answer: scoring.negative_points_per_wrong_answer,
    })
    .eq('id', surgeId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/surges/${surgeId}`);
}

export async function setSurgeStatusAction(surgeId: string, status: 'draft' | 'live' | 'complete') {
  await requireAdmin(['professor', 'committee_member']);
  const supabase = await createClient();
  // Marking a Surge complete finalizes pooled group scoring (decision 49) —
  // routed through complete_surge() rather than a raw status update, so the
  // participation/earned pools get computed and credited atomically.
  if (status === 'complete') {
    const { error } = await supabase.rpc('complete_surge', { p_surge_id: surgeId });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('surges').update({ status }).eq('id', surgeId);
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/admin/surges/${surgeId}`);
}

export async function addQuestionAction(
  surgeId: string,
  q: {
    text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: 'A' | 'B' | 'C' | 'D';
    time_limit_seconds: number;
    tag: string;
    order_index: number;
  }
) {
  await requireAdmin(['professor', 'committee_member']);
  const supabase = await createClient();
  const { error } = await supabase.from('questions').insert({ surge_id: surgeId, ...q });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/surges/${surgeId}`);
}

export async function updateQuestionAction(questionId: string, surgeId: string, patch: TablesUpdate<'questions'>) {
  await requireAdmin(['professor', 'committee_member']);
  const supabase = await createClient();
  const { error } = await supabase.from('questions').update(patch).eq('id', questionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/surges/${surgeId}`);
}

export async function deleteQuestionAction(questionId: string, surgeId: string) {
  await requireAdmin(['professor', 'committee_member']);
  const supabase = await createClient();
  const { error } = await supabase.from('questions').delete().eq('id', questionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/surges/${surgeId}`);
}

export async function importQuestionsAction(surgeId: string, rows: ParsedRow[]) {
  await requireAdmin(['professor', 'committee_member']);
  const supabase = await createClient();

  const clean = rows.filter((r) => r.errors.length === 0);
  const { data: existingMax } = await supabase
    .from('questions')
    .select('order_index')
    .eq('surge_id', surgeId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  let nextIndex = (existingMax?.order_index ?? -1) + 1;

  const payload = clean.map((r) => ({
    surge_id: surgeId,
    text: r.question,
    option_a: r.option_a,
    option_b: r.option_b,
    option_c: r.option_c,
    option_d: r.option_d,
    correct_option: r.correct_option as 'A' | 'B' | 'C' | 'D',
    time_limit_seconds: r.time_limit_seconds,
    time_limit_flagged: r.time_limit_flagged,
    tag: r.tag || null,
    order_index: nextIndex++,
  }));

  if (payload.length > 0) {
    const { error } = await supabase.from('questions').insert(payload);
    if (error) throw new Error(error.message);
  }

  await supabase.rpc('log_csv_import', {
    p_surge_id: surgeId,
    p_details: { imported: payload.length, skipped: rows.length - payload.length },
  });

  revalidatePath(`/admin/surges/${surgeId}`);
  return { imported: payload.length, skipped: rows.length - payload.length };
}
