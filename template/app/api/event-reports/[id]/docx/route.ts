import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  VerticalAlign,
  VerticalMergeType,
  WidthType,
  BorderStyle,
  LevelFormat,
} from 'docx';
import { createClient } from '@/lib/supabase/server';
import { formatDateUTC, formatTimeUTC } from '@/lib/jules/format-date';

/**
 * Generates a real .docx matching the Adani University "Event Completion
 * Report" reference template's actual visual layout: a bordered masthead
 * table (logo + title + Event Name/Date/Time/Venue), then Organised
 * by/Coordinator, then Introduction/Objectives/Event Highlights/Outcomes/
 * Conclusion/Attachments — objectives and outcomes lettered (a, b, c...),
 * coordinator and attachments numbered (1, 2, 3...), matching the paper
 * template exactly rather than generic bullets. No auth check — event_reports
 * already has a public "anyone reads event reports" policy, same content
 * already shown on the public detail page, so a downloadable copy needs no
 * extra access control.
 */
const CELL_BORDER = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const CELL_BORDERS = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: report } = await supabase.from('event_reports').select('*').eq('id', id).maybeSingle();
  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const { data: events } = await supabase.rpc('public_events');
  const event = (events ?? []).find((e) => e.id === report.event_id);
  const logoBuffer = await readFile(path.join(process.cwd(), 'public/brand/adani-university-logo-print.jpg'));

  const labelCell = (label: string, value: string) =>
    new TableCell({
      borders: CELL_BORDERS,
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [
        new Paragraph({
          children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value })],
        }),
      ],
    });

  const sectionHeading = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text: `${text}:`, bold: true })],
      spacing: { before: 240, after: 120 },
    });

  const numberedList = (items: string[], reference: string) =>
    items.length > 0
      ? items.map((item) => new Paragraph({ text: item, numbering: { reference, level: 0 } }))
      : [new Paragraph({ text: '' })];

  const attachmentLines: string[] = [];
  if (report.attachment_attendance_list_paths.length > 0) attachmentLines.push('Attendance List attached');
  if (report.attachment_brochure_paths.length > 0) attachmentLines.push('Event Brochure/Flyer/e-invitation');
  if (report.attachment_geo_photos_paths.length > 0) attachmentLines.push('Geo-tagged photographs');
  if (report.attachment_media_coverage_paths.length > 0) attachmentLines.push('Social media/Print media coverage (if any)');

  const mastheadTable = new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: [2200, 6800],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            borders: CELL_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'EVENT COMPLETION REPORT', bold: true, size: 26 })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: CELL_BORDERS,
            verticalMerge: VerticalMergeType.RESTART,
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({ type: 'jpg', data: logoBuffer, transformation: { width: 120, height: 64 } }),
                ],
              }),
            ],
          }),
          labelCell('Event Name', report.title),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: CELL_BORDERS,
            verticalMerge: VerticalMergeType.CONTINUE,
            children: [new Paragraph({ text: '' })],
          }),
          labelCell('Date', event ? formatDateUTC(event.event_date) : ''),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: CELL_BORDERS,
            verticalMerge: VerticalMergeType.CONTINUE,
            children: [new Paragraph({ text: '' })],
          }),
          labelCell('Time', event ? formatTimeUTC(event.event_date) : ''),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: CELL_BORDERS,
            verticalMerge: VerticalMergeType.CONTINUE,
            children: [new Paragraph({ text: '' })],
          }),
          labelCell('Venue', event?.location ?? ''),
        ],
      }),
    ],
  });

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'objectives-list',
          levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: '%1)', alignment: AlignmentType.LEFT }],
        },
        {
          reference: 'outcomes-list',
          levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: '%1)', alignment: AlignmentType.LEFT }],
        },
        {
          reference: 'coordinator-list',
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT }],
        },
        {
          reference: 'attachments-list',
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT }],
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: [
          mastheadTable,
          new Paragraph({ text: '', spacing: { before: 120 } }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Organised by: ', bold: true }),
              new TextRun({ text: event?.club_name ?? '' }),
            ],
            spacing: { after: 120 },
          }),

          sectionHeading('Coordinator'),
          ...numberedList([report.coordinator_name], 'coordinator-list'),

          sectionHeading('Introduction'),
          new Paragraph({ text: report.introduction, spacing: { after: 120 } }),

          sectionHeading('Objectives'),
          ...numberedList(report.objectives ?? [], 'objectives-list'),

          sectionHeading('Event Highlights'),
          new Paragraph({ text: report.event_highlights, spacing: { after: 120 } }),

          sectionHeading('Outcomes'),
          ...numberedList(report.outcomes ?? [], 'outcomes-list'),

          sectionHeading('Conclusion'),
          new Paragraph({ text: report.conclusion, spacing: { after: 120 } }),

          sectionHeading('Attachments'),
          ...numberedList(attachmentLines, 'attachments-list'),
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
