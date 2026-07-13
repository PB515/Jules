'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export interface ActionResult {
  error?: string;
}

export async function createEventReportAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['owner', 'officer']);
  const title = String(formData.get('title') ?? '').trim();
  const summary = String(formData.get('summary') ?? '').trim();
  const eventId = String(formData.get('event_id') ?? '');
  const highlights = formData
    .getAll('highlights')
    .map((h) => String(h).trim())
    .filter(Boolean);
  if (!title || !summary || !eventId) return { error: 'Fill in the event, title, and summary.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('event_reports').insert({
    title,
    summary,
    highlights,
    event_id: eventId,
    uploaded_by: user?.id,
  });
  if (error) return { error: error.message };

  redirect('/admin/event-reports');
}
