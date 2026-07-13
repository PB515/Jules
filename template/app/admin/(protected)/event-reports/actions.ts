'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export interface ActionResult {
  error?: string;
}

export async function createEventReportAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['professor', 'committee_member']);
  const eventId = String(formData.get('event_id') ?? '');
  const coordinatorName = String(formData.get('coordinator_name') ?? '').trim();
  const introduction = String(formData.get('introduction') ?? '').trim();
  const eventHighlights = String(formData.get('event_highlights') ?? '').trim();
  const conclusion = String(formData.get('conclusion') ?? '').trim();
  const objectives = formData.getAll('objectives').map((o) => String(o).trim()).filter(Boolean);
  const outcomes = formData.getAll('outcomes').map((o) => String(o).trim()).filter(Boolean);
  const attachmentAttendanceList = formData.get('attachment_attendance_list') === 'on';
  const attachmentBrochure = formData.get('attachment_brochure') === 'on';
  const attachmentGeoPhotos = formData.get('attachment_geo_photos') === 'on';
  const attachmentMediaCoverage = formData.get('attachment_media_coverage') === 'on';

  if (!eventId) return { error: 'Pick the event this report is about.' };
  if (!coordinatorName || !introduction || !eventHighlights || !conclusion) {
    return { error: 'Fill in the coordinator, introduction, event highlights, and conclusion.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // title mirrors the event's own name at creation time (auto-filled, not
  // retyped) — kept as its own column so the report's identity stays
  // stable even if the underlying event is renamed later.
  const { data: event } = await supabase.from('events').select('name').eq('id', eventId).maybeSingle();
  if (!event) return { error: 'Event not found.' };

  const { error } = await supabase.from('event_reports').insert({
    title: event.name,
    event_id: eventId,
    coordinator_name: coordinatorName,
    introduction,
    objectives,
    event_highlights: eventHighlights,
    outcomes,
    conclusion,
    attachment_attendance_list: attachmentAttendanceList,
    attachment_brochure: attachmentBrochure,
    attachment_geo_photos: attachmentGeoPhotos,
    attachment_media_coverage: attachmentMediaCoverage,
    uploaded_by: user?.id,
  });
  if (error) return { error: error.message };

  redirect('/admin/event-reports');
}
