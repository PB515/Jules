'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export interface ActionResult {
  error?: string;
}

const JOULE_BY_TYPE: Record<string, number> = {
  standard_meeting: 10,
  expert_session: 25,
  volunteer_task: 50,
};

export async function createEventAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['professor', 'committee_member']);

  const name = String(formData.get('name') ?? '').trim();
  const clubId = String(formData.get('club_id') ?? '');
  const type = String(formData.get('type') ?? '');
  const eventDate = String(formData.get('event_date') ?? '');
  const location = String(formData.get('location') ?? '').trim();

  if (!name || !type || !eventDate) return { error: 'Fill in name, type, and date.' };
  if (!clubId) return { error: 'Pick the club this event belongs to.' };
  if (!(type in JOULE_BY_TYPE)) return { error: 'Invalid event type.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('events')
    .insert({
      name,
      club_id: clubId,
      type: type as 'standard_meeting' | 'expert_session' | 'volunteer_task',
      event_date: new Date(eventDate).toISOString(),
      location: location || null,
      joule_value: JOULE_BY_TYPE[type],
      created_by: user?.id,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  redirect(`/admin/grid?event=${data.id}`);
}
