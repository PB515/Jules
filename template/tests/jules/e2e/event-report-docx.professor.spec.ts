import { test, expect } from '@playwright/test';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import PizZip from 'pizzip';
import { asUserCommit, connect, serviceClient, testId } from '../db-helpers';
import pg from 'pg';

/**
 * Phase 3: the Word doc export gains a real Registered Students roster,
 * an Attendance Summary, and embedded attachment images — and, since the
 * file now carries student contact info, a real requireAdmin() gate where
 * there was none before (decision: the download route matches the public
 * page's already-admin-gated download *link*, closing the previous
 * link-hidden-but-route-open gap).
 *
 * Verifies both the security change (unauthenticated request is rejected)
 * and the actual content (unzips the real downloaded .docx and checks its
 * document.xml + embedded media, not just "a file arrived").
 */
test.describe('Event Report .docx export', () => {
  const id = testId();
  const svc = serviceClient();
  let db: pg.Client;

  let clubId: string;
  let eventId: string;
  let reportId: string;
  let voltId: string;
  let ampId: string;
  const attachmentPath = `test-fixtures/${id}/attendance-1.png`;

  test.beforeAll(async () => {
    db = await connect();

    const { data: club, error: clubErr } = await svc
      .from('clubs')
      .insert({ name: `Phase 3 Docx Club ${id}`, slug: `phase3-docx-club-${id}` })
      .select('id')
      .single();
    if (clubErr) throw clubErr;
    clubId = club!.id;

    const { data: event, error: eventErr } = await svc
      .from('events')
      .insert({
        name: `Phase 3 Docx Event ${id}`,
        type: 'standard_meeting',
        // event_date must be within redeem_event_scan's +/-15 minute scan
        // window when the fixture actually calls it below, AND end_date
        // must be far enough in the future that register_for_event doesn't
        // reject with "this event has already ended" — event_date alone,
        // with no end_date, made the event technically already over by the
        // time the RPC ran a few ms after "now" was captured.
        event_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1800_000).toISOString(),
        joule_value: 10,
        club_id: clubId,
        location: 'Docx Test Hall',
      })
      .select('id')
      .single();
    if (eventErr) throw eventErr;
    eventId = event!.id;

    const { data: voltRow, error: voltErr } = await svc
      .from('students')
      .select('id')
      .eq('college_email', 'jules.demo.volt@gmail.com')
      .single();
    if (voltErr) throw voltErr;
    voltId = voltRow!.id;
    const { data: ampRow, error: ampErr } = await svc
      .from('students')
      .select('id')
      .eq('college_email', 'jules.demo.amp@gmail.com')
      .single();
    if (ampErr) throw ampErr;
    ampId = ampRow!.id;

    await asUserCommit(db, voltId, (c) => c.query('select * from register_for_event($1)', [eventId]));
    await asUserCommit(db, ampId, (c) => c.query('select * from register_for_event($1)', [eventId]));
    // Only volt actually attends — the roster's "Attended" column and the
    // Attendance Summary counts both need a real mix, not all-yes/all-no.
    const tokenResult = await db.query('select public.qr_token_for_epoch($1, public.qr_epoch()) as token', [eventId]);
    await asUserCommit(db, voltId, (c) => c.query('select * from redeem_event_scan($1, $2)', [eventId, tokenResult.rows[0].token]));

    // A real (tiny, valid) PNG, uploaded to the real bucket — proves the
    // actual fetch-and-embed path works, not just that the loop tag exists.
    const pngBuffer = readFileSync(path.join(__dirname, '../../../public/icons/icon-192.png'));
    const { error: uploadErr } = await svc.storage.from('event-report-attachments').upload(attachmentPath, pngBuffer, {
      contentType: 'image/png',
    });
    if (uploadErr) throw uploadErr;

    const { data: report, error: reportErr } = await svc
      .from('event_reports')
      .insert({
        title: `Phase 3 Docx Event ${id}`,
        event_id: eventId,
        coordinators: ['Test Coordinator One'],
        introduction: 'A real end-to-end test of the docx export.',
        objectives: ['Prove the roster table renders.', 'Prove images embed correctly.'],
        event_highlights: 'Everything rendered with real data.',
        outcomes: ['Confirmed the full Phase 3 pipeline works.'],
        conclusion: 'The export is correct.',
        attachment_attendance_list_paths: [attachmentPath],
      })
      .select('id')
      .single();
    if (reportErr) throw reportErr;
    reportId = report!.id;
  });

  test.afterAll(async () => {
    await svc.from('event_reports').delete().eq('id', reportId);
    await svc.storage.from('event-report-attachments').remove([attachmentPath]);
    await svc.from('event_registrations').delete().eq('event_id', eventId);
    await svc.from('events').delete().eq('id', eventId);
    await svc.from('clubs').delete().eq('id', clubId);
    await db.end();
  });

  test('unauthenticated request is rejected, not silently served', async ({ baseURL }) => {
    // The `request` fixture inherits this project's storageState (the
    // professor session) automatically — using it here would silently test
    // an AUTHENTICATED request. Plain fetch() has no cookies at all, no
    // ambiguity. (This test initially passed for the wrong reason: an
    // earlier version of the route crashed rendering for every caller,
    // authenticated or not, which also happened to not be 200 — masking
    // whether the real auth check did anything at all.)
    const res = await fetch(`${baseURL}/api/event-reports/${reportId}/docx`, { redirect: 'manual' });
    expect(res.status, 'must not be a plain 200 with the file').not.toBe(200);
  });

  test('a logged-in Professor downloads a real .docx with the roster, attendance summary, and embedded image', async ({
    page,
  }) => {
    const downloadPromise = page.waitForEvent('download');
    // goto() itself "fails" when the navigation resolves into a download
    // instead of a page load — the download event is the real signal here.
    await page.goto(`/api/event-reports/${reportId}/docx`).catch(() => {});
    const download = await downloadPromise;

    const dir = mkdtempSync(path.join(tmpdir(), 'docx-test-'));
    const filePath = path.join(dir, 'report.docx');
    await download.saveAs(filePath);

    const zip = new PizZip(readFileSync(filePath));
    const documentXml = zip.file('word/document.xml')!.asText();

    // Roster table: real student data, not a placeholder.
    expect(documentXml).toContain('Demo Volt');
    expect(documentXml).toContain('jules.demo.volt@gmail.com');
    expect(documentXml).toContain('Demo Amp');
    // No unresolved loop/tag syntax left in the output — the clearest sign
    // a docxtemplater loop or image tag broke instead of actually rendering.
    expect(documentXml).not.toContain('{#');
    expect(documentXml).not.toContain('{%');
    expect(documentXml).not.toContain('{name}');

    // Attendance Summary: 2 registered, 1 attended (volt only).
    expect(documentXml).toContain('>2<');
    expect(documentXml).toContain('>1<');

    // The real uploaded image actually got embedded, not just referenced.
    const mediaFiles = Object.keys(zip.files).filter((f) => f.startsWith('word/media/'));
    expect(mediaFiles.length, 'at least the original template logo + the new uploaded photo').toBeGreaterThan(1);
  });
});
