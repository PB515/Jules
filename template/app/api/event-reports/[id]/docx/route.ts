import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { createClient } from '@/lib/supabase/server';
import { formatDateUTC, formatTimeUTC } from '@/lib/jules/format-date';

/**
 * Fills the real Adani University "Event Completion Report" template
 * (lib/jules/templates/event-completion-report.docx — a literal copy of the
 * professor-supplied reference doc, tagged with docxtemplater placeholders)
 * with a report's data. Coordinators are pre-numbered as plain strings
 * ("1. Name") since that section has no Word auto-numbering in the source
 * template; Objectives/Outcomes are passed as bare strings and rely on the
 * template's own real Word auto-lettering (a, b, c...) via each loop's
 * marker-paragraph structure. No auth check — event_reports already has a
 * public "anyone reads event reports" policy, same content already shown on
 * the public detail page, so a downloadable copy needs no extra access
 * control.
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

  const templateBuffer = await readFile(
    path.join(process.cwd(), 'lib/jules/templates/event-completion-report.docx')
  );
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

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
