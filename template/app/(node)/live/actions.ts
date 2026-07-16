'use server';

import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export interface ActionResult {
  error?: string;
}

export async function resolveRoomCodeAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireStudent();
  const roomCode = String(formData.get('room_code') ?? '').trim();
  if (!roomCode) return { error: 'Enter the room code.' };

  const supabase = await createClient();
  const { data: round } = await supabase
    .from('live_rounds')
    .select('id, phase')
    .eq('room_code', roomCode.toUpperCase())
    .maybeSingle();
  if (!round) return { error: 'Room not found.' };
  if (round.phase === 'complete') return { error: 'This round has already ended.' };

  redirect(`/live/${round.id}`);
}
