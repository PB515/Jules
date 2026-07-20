import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { formatDateUTC, formatTimeUTC } from '@/lib/jules/format-date';
import { getEventRegistrations } from '@/lib/jules/event-registrations';

/**
 * Fills the real Adani University "Event Completion Report" template
 * (lib/jules/templates/event-completion-report.docx — a literal copy of the
 * professor-supplied reference doc, tagged with docxtemplater placeholders)
 * with a report's data. Coordinators are pre-numbered as plain strings
 * ("1. Name") since that section has no Word auto-numbering in the source
 * template; Objectives/Outcomes are passed as bare strings and rely on the
 * template's own real Word auto-lettering (a, b, c...) via each loop's
 * marker-paragraph structure.
 *
 * Phase 3: gained a Registered Students roster table, an Attendance Summary
 * table, and embedded attachment images — all sourced from real data, none
 * fabricated. This is a deliberate posture change from the original "no
 * auth check, by design": that was fine when the file only ever contained
 * text already public on the report page, but the roster now carries real
 * student emails/phone numbers, so this route needs the same gate the
 * public report page's download *link* already enforces (decision 65) —
 * closing what was otherwise a link-hidden-but-route-open gap.
 */

const ATTACHMENT_CATEGORIES = [
  { column: 'attachment_attendance_list_paths', tag: 'attendance_list_images' },
  { column: 'attachment_brochure_paths', tag: 'brochure_images' },
  { column: 'attachment_geo_photos_paths', tag: 'geo_photos_images' },
  { column: 'attachment_media_coverage_paths', tag: 'media_coverage_images' },
] as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: report } = await supabase.from('event_reports').select('*').eq('id', id).maybeSingle();
  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const { data: events } = await supabase.rpc('public_events');
  const event = (events ?? []).find((e) => e.id === report.event_id);

  const registrations = await getEventRegistrations(supabase, report.event_id);
  const attendedCount = registrations.filter((r) => r.attended_at).length;

  // Attachment bucket is public-read (0030) — a direct fetch of the public
  // URL is simplest, no service-role needed just to read image bytes.
  //
  // Images are passed as base64 STRINGS, not raw bytes — a real quirk of
  // docxtemplater-image-module-free found by reproducing a render crash
  // standalone: its render() branches on `typeof tagValue === 'object'` to
  // detect an already-resolved internal `{rId, sizePixel}` shape, but a raw
  // Buffer/Uint8Array is ALSO `typeof === 'object'`, so it collided with
  // that branch and crashed reading `sizePixel[0]` of undefined. A string
  // tag value avoids the collision entirely; getImage() below decodes it.
  const imageData: Record<string, string[]> = {};
  for (const { column, tag } of ATTACHMENT_CATEGORIES) {
    const paths = report[column] ?? [];
    const images = await Promise.all(
      paths.map(async (p) => {
        const { data: publicUrl } = supabase.storage.from('event-report-attachments').getPublicUrl(p);
        const res = await fetch(publicUrl.publicUrl);
        const bytes = Buffer.from(await res.arrayBuffer());
        return bytes.toString('base64');
      })
    );
    imageData[tag] = images;
  }

  const templateBuffer = await readFile(
    path.join(process.cwd(), 'lib/jules/templates/event-completion-report.docx')
  );
  const zip = new PizZip(templateBuffer);

  const imageModule = new ImageModule({
    getImage: (tagValue: unknown) => Buffer.from(tagValue as string, 'base64'),
    // Fixed size rather than reading real dimensions — a reasonable
    // simplification for a report document, not meant to be a photo gallery.
    getSize: () => [280, 210],
  });

  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, modules: [imageModule] });

  doc.render({
    event_name: report.title,
    event_date: event ? formatDateUTC(event.event_date) : '',
    event_time: event ? formatTimeUTC(event.event_date) : '',
    venue: event?.location ?? '',
    club_name: event?.club_name ?? '',
    coordinators: report.coordinators.map((name, i) => `${i + 1}. ${name}`),
    introduction: report.introduction,
    objectives: report.objectives ?? [],
    event_highlights: report.event_highlights,
    outcomes: report.outcomes ?? [],
    conclusion: report.conclusion,
    registrations: registrations.map((r) => ({
      name: r.name,
      email: r.college_email,
      phone: r.phone ?? '',
      attended: r.attended_at ? 'Yes' : 'No',
    })),
    total_registered: String(registrations.length),
    total_attended: String(attendedCount),
    ...imageData,
  });

  const buffer = doc.getZip().generate({ type: 'nodebuffer' });
  const filename = `${report.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')}-event-report.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
