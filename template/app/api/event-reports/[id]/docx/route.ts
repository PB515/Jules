import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { createClient } from '@/lib/supabase/server';
import { formatDateUTC, formatTimeUTC } from '@/lib/jules/format-date';

/**
 * Generates a real .docx matching the Adani University "Event Completion
 * Report" reference template exactly (label lines, then Introduction/
 * Objectives/Event Highlights/Outcomes/Conclusion/Attachments in that
 * order). No auth check — event_reports already has a public "anyone reads
 * event reports" policy, same content already shown on the public detail
 * page, so a downloadable copy needs no extra access control.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: report } = await supabase.from('event_reports').select('*').eq('id', id).maybeSingle();
  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const { data: events } = await supabase.rpc('public_events');
  const event = (events ?? []).find((e) => e.id === report.event_id);

  const labelValue = (label: string, value: string) =>
    new Paragraph({
      children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value })],
      spacing: { after: 120 },
    });

  const sectionHeading = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text, bold: true })],
      spacing: { before: 240, after: 120 },
    });

  const bulletParagraphs = (items: string[]) =>
    items.length > 0
      ? items.map((item) => new Paragraph({ text: item, bullet: { level: 0 } }))
      : [new Paragraph({ text: '' })];

  const attachmentLines: string[] = [];
  if (report.attachment_attendance_list) attachmentLines.push('Attendance List attached');
  if (report.attachment_brochure) attachmentLines.push('Event Brochure/Flyer/e-invitation');
  if (report.attachment_geo_photos) attachmentLines.push('Geo-tagged photographs');
  if (report.attachment_media_coverage) attachmentLines.push('Social media/Print media coverage (if any)');

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'EVENT COMPLETION REPORT', bold: true, size: 32 })],
            spacing: { after: 240 },
          }),
          labelValue('Event Name', report.title),
          labelValue('Date', event ? formatDateUTC(event.event_date) : ''),
          labelValue('Time', event ? formatTimeUTC(event.event_date) : ''),
          labelValue('Venue', event?.location ?? ''),
          labelValue('Organised by', event?.club_name ?? ''),
          labelValue('Coordinator', report.coordinator_name),

          sectionHeading('Introduction'),
          new Paragraph({ text: report.introduction, spacing: { after: 120 } }),

          sectionHeading('Objectives'),
          ...bulletParagraphs(report.objectives ?? []),

          sectionHeading('Event Highlights'),
          new Paragraph({ text: report.event_highlights, spacing: { after: 120 } }),

          sectionHeading('Outcomes'),
          ...bulletParagraphs(report.outcomes ?? []),

          sectionHeading('Conclusion'),
          new Paragraph({ text: report.conclusion, spacing: { after: 120 } }),

          sectionHeading('Attachments'),
          ...bulletParagraphs(attachmentLines),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const filename = `${report.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')}-event-report.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
