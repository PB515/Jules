'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export interface ActionResult {
  error?: string;
}

async function uploadAttachmentImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  fieldName: string
): Promise<{ paths: string[]; error?: string }> {
  const files = formData.getAll(fieldName).filter((f): f is File => f instanceof File && f.size > 0);
  const paths: string[] = [];
  for (const file of files) {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('event-report-attachments').upload(path, file);
    if (error) return { paths, error: error.message };
    paths.push(path);
  }
  return { paths };
}

export async function createEventReportAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['professor', 'committee_member', 'super_admin']);
  const eventId = String(formData.get('event_id') ?? '');
  const coordinators = formData.getAll('coordinators').map((c) => String(c).trim()).filter(Boolean);
  const introduction = String(formData.get('introduction') ?? '').trim();
  const eventHighlights = String(formData.get('event_highlights') ?? '').trim();
  const conclusion = String(formData.get('conclusion') ?? '').trim();
  const objectives = formData.getAll('objectives').map((o) => String(o).trim()).filter(Boolean);
  const outcomes = formData.getAll('outcomes').map((o) => String(o).trim()).filter(Boolean);

  if (!eventId) return { error: 'Pick the event this report is about.' };
  if (coordinators.length === 0 || !introduction || !eventHighlights || !conclusion) {
    return { error: 'Fill in at least one coordinator, the introduction, event highlights, and conclusion.' };
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

  const [attendanceList, brochure, geoPhotos, mediaCoverage] = await Promise.all([
    uploadAttachmentImages(supabase, formData, 'attachment_attendance_list'),
    uploadAttachmentImages(supabase, formData, 'attachment_brochure'),
    uploadAttachmentImages(supabase, formData, 'attachment_geo_photos'),
    uploadAttachmentImages(supabase, formData, 'attachment_media_coverage'),
  ]);
  const uploadError = attendanceList.error ?? brochure.error ?? geoPhotos.error ?? mediaCoverage.error;
  if (uploadError) return { error: uploadError };

  const { error } = await supabase.from('event_reports').insert({
    title: event.name,
    event_id: eventId,
    coordinators,
    introduction,
    objectives,
    event_highlights: eventHighlights,
    outcomes,
    conclusion,
    attachment_attendance_list_paths: attendanceList.paths,
    attachment_brochure_paths: brochure.paths,
    attachment_geo_photos_paths: geoPhotos.paths,
    attachment_media_coverage_paths: mediaCoverage.paths,
    uploaded_by: user?.id,
  });
  if (error) return { error: error.message };

  redirect('/admin/event-reports');
}
