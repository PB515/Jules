'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { logAdminAction } from '@/lib/jules/audit';
import { sendPushToStudents } from '@/lib/jules/push';
import { redirect } from 'next/navigation';

export interface ActionResult {
  error?: string;
}

const JOULE_BY_TYPE: Record<string, number> = {
  participation: 10,
  expert_session: 5,
  volunteer_task: 15,
};

async function uploadCoverImage(supabase: Awaited<ReturnType<typeof createClient>>, formData: FormData): Promise<{ path?: string; error?: string }> {
  const file = formData.get('cover_image');
  if (!(file instanceof File) || file.size === 0) return {};

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('event-covers').upload(path, file);
  if (error) return { error: error.message };
  return { path };
}

export async function createEventAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['professor', 'committee_member', 'super_admin']);

  const name = String(formData.get('name') ?? '').trim();
  const clubId = String(formData.get('club_id') ?? '');
  const type = String(formData.get('type') ?? '');
  const eventDate = String(formData.get('event_date') ?? '');
  const eventTime = String(formData.get('event_time') ?? '');
  const location = String(formData.get('location') ?? '').trim();
  const registrationFormUrl = String(formData.get('registration_form_url') ?? '').trim();
  const attendanceDurationMinutes = Number(formData.get('attendance_duration_minutes') ?? 20);

  if (!name || !type || !eventDate || !eventTime) return { error: 'Fill in name, type, date, and time.' };
  if (!clubId) return { error: 'Pick the club this event belongs to.' };
  if (!(type in JOULE_BY_TYPE)) return { error: 'Invalid event type.' };
  if (!Number.isFinite(attendanceDurationMinutes) || attendanceDurationMinutes <= 0) {
    return { error: 'Attendance window must be a positive number of minutes.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cover = await uploadCoverImage(supabase, formData);
  if (cover.error) return { error: cover.error };

  const { data, error } = await supabase
    .from('events')
    .insert({
      name,
      club_id: clubId,
      type: type as 'participation' | 'expert_session' | 'volunteer_task',
      event_date: new Date(`${eventDate}T${eventTime}`).toISOString(),
      location: location || null,
      registration_form_url: registrationFormUrl || null,
      cover_image_path: cover.path ?? null,
      joule_value: JOULE_BY_TYPE[type],
      attendance_duration_minutes: attendanceDurationMinutes,
      created_by: user?.id,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await logAdminAction(supabase, 'event_create', { event_id: data.id, name, club_id: clubId });

  // Type 1 — broadcast to every student. Fire-and-forget: a push-sending
  // hiccup must never block the admin from successfully creating the
  // event, so this is logged, not surfaced as an ActionResult error.
  sendPushToStudents(null, {
    title: `New event: ${name}`,
    body: location ? `at ${location}` : 'Check it out on the calendar.',
    url: `/events/${data.id}`,
  }).catch((err) => console.error('push (event_create) failed', err));

  redirect(`/admin/grid?event=${data.id}`);
}

export async function editEventAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin(['professor', 'committee_member', 'super_admin']);

  const eventId = String(formData.get('event_id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const type = String(formData.get('type') ?? '');
  const eventDate = String(formData.get('event_date') ?? '');
  const eventTime = String(formData.get('event_time') ?? '');
  const location = String(formData.get('location') ?? '').trim();
  const registrationFormUrl = String(formData.get('registration_form_url') ?? '').trim();
  const attendanceDurationMinutes = Number(formData.get('attendance_duration_minutes') ?? 20);

  if (!eventId) return { error: 'Missing event.' };
  if (!name || !type || !eventDate || !eventTime) return { error: 'Fill in name, type, date, and time.' };
  if (!(type in JOULE_BY_TYPE)) return { error: 'Invalid event type.' };
  if (!Number.isFinite(attendanceDurationMinutes) || attendanceDurationMinutes <= 0) {
    return { error: 'Attendance window must be a positive number of minutes.' };
  }

  const supabase = await createClient();

  // Fetched before the update so Type 2 (registered-students-only) can
  // detect an actual location/date change afterward, not just any edit.
  const { data: before } = await supabase.from('events').select('location, event_date').eq('id', eventId).maybeSingle();

  const cover = await uploadCoverImage(supabase, formData);
  if (cover.error) return { error: cover.error };

  // A club-scoped Professor or Committee Member may only edit their own
  // club's events; a Super Admin can edit any (0038's RBAC rework made
  // Professor club-scoped too — RLS already enforces this via
  // can_manage_event(), this app-layer filter just matches it so an
  // out-of-scope edit fails cleanly with 0 rows instead of relying on RLS
  // alone to reject it).
  let query = supabase.from('events').update({
    name,
    type: type as 'participation' | 'expert_session' | 'volunteer_task',
    event_date: new Date(`${eventDate}T${eventTime}`).toISOString(),
    location: location || null,
    registration_form_url: registrationFormUrl || null,
    ...(cover.path ? { cover_image_path: cover.path } : {}),
    joule_value: JOULE_BY_TYPE[type],
    attendance_duration_minutes: attendanceDurationMinutes,
  }).eq('id', eventId);
  if ((admin.role === 'professor' || admin.role === 'committee_member') && admin.club_id) {
    query = query.eq('club_id', admin.club_id);
  }
  const { error } = await query;

  if (error) return { error: error.message };

  await logAdminAction(supabase, 'event_edit', { event_id: eventId, name });

  // Type 2 — only students actually registered for THIS event, and only
  // when the location/date genuinely changed (not on every edit — e.g. a
  // typo fix to the name shouldn't push).
  const newEventDate = new Date(`${eventDate}T${eventTime}`).toISOString();
  const changed = before && (before.location !== (location || null) || before.event_date !== newEventDate);
  if (changed) {
    (async () => {
      const { data: regs } = await supabase.from('event_registrations').select('student_id').eq('event_id', eventId);
      const studentIds = (regs ?? []).map((r) => r.student_id);
      if (studentIds.length === 0) return;
      await sendPushToStudents(studentIds, {
        title: `Update: ${name}`,
        body: location ? `New location: ${location}` : 'The date or venue changed, check the details.',
        url: `/events/${eventId}`,
      });
    })().catch((err) => console.error('push (event_edit) failed', err));
  }

  redirect(`/admin/grid?event=${eventId}`);
}
