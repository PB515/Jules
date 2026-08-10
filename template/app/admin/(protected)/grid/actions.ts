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

// The "volunteer" credit here is a per-registration role on THIS event
// (event_registrations.role, set via set_registration_role) -- distinct
// from the 'volunteer_task' event *type* above. A Participation event can
// still have a few registered students marked as volunteers and credited
// this amount instead of the event's normal joule_value at scan time. See
// migration 0052.
const DEFAULT_VOLUNTEER_JOULE_VALUE = 15;

function parseVolunteerJouleValue(formData: FormData): { value?: number; error?: string } {
  const raw = String(formData.get('volunteer_joule_value') ?? '').trim();
  if (!raw) return { value: DEFAULT_VOLUNTEER_JOULE_VALUE };
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return { error: 'Volunteer bonus must be a positive number.' };
  return { value };
}

// A real, previously-undiscovered bug: `new Date(`${date}T${time}`)` (no
// explicit offset) parses as local time in whatever timezone the *runtime*
// happens to be in — for a Server Action, that's Vercel's own server
// timezone (UTC), not the admin's real one (India, IST, UTC+5:30, no DST).
// An admin typing "1:00 PM" was silently getting 1:00 PM UTC stored (=
// 6:30 PM IST) — a 5.5-hour drift that stayed invisible only because the
// display side (formatDateUTC/formatTimeUTC, lib/jules/format-date.ts)
// used to format in raw UTC too, so "what you typed" still matched "what
// you saw" even though both were wrong relative to real IST wall-clock
// time. Fixed together: this helper pins the admin's typed date/time to
// IST explicitly before converting to the true UTC instant for storage,
// and format-date.ts now displays in Asia/Kolkata instead of UTC, so
// anything comparing event_date against real `Date.now()` (hasConcluded(),
// the QR attendance window, day-before reminders) becomes correct too,
// with no changes needed at those call sites.
function toUtcFromIst(date: string, time: string): string {
  return new Date(`${date}T${time}:00+05:30`).toISOString();
}

// Displayed at aspect-video (16:9) with object-cover on both the events
// grid and detail page (app/(general)/events/*) — the size/type limits
// below are enforced server-side too, not just hinted in the form, since
// the client's `accept`/helper text alone is never a real guarantee.
const COVER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const COVER_IMAGE_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// End date/time is optional — not every event (e.g. a single QR check-in
// moment) has a meaningful "end," matching the already-nullable
// events.end_date column, which app/admin/(protected)/grid/page.tsx and
// the public event detail page already read (`e.end_date ?? e.event_date`)
// but no form has ever actually let an admin set.
function parseEventEnd(formData: FormData, startIso: string): { endIso?: string | null; error?: string } {
  const endDate = String(formData.get('event_end_date') ?? '').trim();
  const endTime = String(formData.get('event_end_time') ?? '').trim();
  if (!endDate && !endTime) return { endIso: null };
  if (!endDate || !endTime) return { error: 'Fill in both an end date and an end time, or leave both blank.' };

  const endIso = toUtcFromIst(endDate, endTime);
  if (endIso <= startIso) return { error: 'End date/time must be after the start date/time.' };
  return { endIso };
}

async function uploadCoverImage(supabase: Awaited<ReturnType<typeof createClient>>, formData: FormData): Promise<{ path?: string; error?: string }> {
  const file = formData.get('cover_image');
  if (!(file instanceof File) || file.size === 0) return {};

  if (file.size > COVER_IMAGE_MAX_BYTES) {
    return { error: 'Cover image is too large — please use a JPG, PNG, or WebP under 5MB.' };
  }
  if (!COVER_IMAGE_ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Cover image must be a JPG, PNG, or WebP file.' };
  }

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

  const startIso = toUtcFromIst(eventDate, eventTime);
  const end = parseEventEnd(formData, startIso);
  if (end.error) return { error: end.error };

  const volunteerJouleValue = parseVolunteerJouleValue(formData);
  if (volunteerJouleValue.error) return { error: volunteerJouleValue.error };

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
      event_date: startIso,
      end_date: end.endIso,
      location: location || null,
      registration_form_url: registrationFormUrl || null,
      cover_image_path: cover.path ?? null,
      joule_value: JOULE_BY_TYPE[type],
      volunteer_joule_value: volunteerJouleValue.value,
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

  const newEventDate = toUtcFromIst(eventDate, eventTime);
  const end = parseEventEnd(formData, newEventDate);
  if (end.error) return { error: end.error };

  const volunteerJouleValue = parseVolunteerJouleValue(formData);
  if (volunteerJouleValue.error) return { error: volunteerJouleValue.error };

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
    event_date: newEventDate,
    end_date: end.endIso,
    location: location || null,
    registration_form_url: registrationFormUrl || null,
    ...(cover.path ? { cover_image_path: cover.path } : {}),
    joule_value: JOULE_BY_TYPE[type],
    volunteer_joule_value: volunteerJouleValue.value,
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
