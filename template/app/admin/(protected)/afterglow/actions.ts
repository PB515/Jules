'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export interface ActionResult {
  error?: string;
}

export async function createAfterglowPostAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['owner', 'officer']);
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const eventId = String(formData.get('event_id') ?? '');
  if (!title || !body || !eventId) return { error: 'Fill in the event, title, and write-up.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('afterglow_posts').insert({
    title,
    body,
    event_id: eventId,
    uploaded_by: user?.id,
  });
  if (error) return { error: error.message };

  redirect('/admin/afterglow');
}
