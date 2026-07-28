'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { logAdminAction } from '@/lib/jules/audit';
import { sendPushToStudents } from '@/lib/jules/push';

export interface SendUpdateResult {
  error?: string;
  success?: boolean;
}

/**
 * The human-controlled third notification trigger (alongside the two
 * automatic ones in grid/actions.ts) — a Committee Member/Professor
 * sending a real update about an event ("bring your laptops," "speaker
 * confirmed") that isn't a change to the event's own location/date
 * fields. Reuses the exact same sendPushToStudents() (push + in-app
 * notification history, one call) the automatic triggers already use.
 */
export async function sendEventUpdateAction(_prev: SendUpdateResult, formData: FormData): Promise<SendUpdateResult> {
  const admin = await requireAdmin(['professor', 'committee_member', 'super_admin']);
  const eventId = String(formData.get('event_id') ?? '');
  const message = String(formData.get('message') ?? '').trim();

  if (!eventId) return { error: 'Pick an event.' };
  if (!message) return { error: 'Write a message first.' };

  const supabase = await createClient();

  let eventQuery = supabase.from('events').select('id, name, club_id').eq('id', eventId);
  if (admin.role !== 'super_admin') {
    eventQuery = eventQuery.eq('club_id', admin.club_id ?? '');
  }
  const { data: event } = await eventQuery.maybeSingle();
  if (!event) return { error: "Couldn't find that event, or it isn't yours to message." };

  const { data: regs } = await supabase.from('event_registrations').select('student_id').eq('event_id', eventId);
  const studentIds = (regs ?? []).map((r) => r.student_id);
  if (studentIds.length === 0) return { error: 'No one has registered for this event yet.' };

  await sendPushToStudents(studentIds, {
    title: `Update: ${event.name}`,
    body: message,
    url: `/events/${eventId}`,
  });

  await logAdminAction(supabase, 'event_update_sent', { event_id: eventId, recipient_count: studentIds.length });

  return { success: true };
}
