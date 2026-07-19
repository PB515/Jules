import { test, expect, devices } from '@playwright/test';
import pg from 'pg';
import { asUserCommit, connect, serviceClient, testId } from '../db-helpers';
import path from 'node:path';

/**
 * Phase 2 ("make the existing Committee Member login + Event Report form
 * work well on a phone") — a verify-then-fix pass, not new architecture.
 * Uses real device emulation (viewport + touch), not a plain resized
 * desktop browser, since that's what actually surfaces touch-target and
 * layout issues.
 *
 * No pre-cached storageState exists for a committee_member (only
 * professor + the 4 demo students are in auth.setup.ts's roster) — this
 * test creates its own disposable one and logs in for real within the
 * test itself, rather than widening the shared setup roster for a single
 * spec.
 */
test.use({ ...devices['iPhone 13'] });

async function hasNoHorizontalScroll(page: import('@playwright/test').Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
}

test('admin login has no horizontal scroll and a touch-friendly submit button', async ({ page }) => {
  await page.goto('/admin/login');
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  const submit = page.getByRole('button', { name: 'Enter' });
  const box = await submit.boundingBox();
  expect(box?.height, '44px minimum touch target').toBeGreaterThanOrEqual(44);
});

test('admin get-app page has no horizontal scroll on a real phone viewport', async ({ page }) => {
  await page.goto('/admin/get-app');
  expect(await hasNoHorizontalScroll(page)).toBe(true);
});

test.describe('Professor: mobile registrations dashboard (widened scope, added post-Phase-1)', () => {
  // Layers a real professor session onto the file-wide iPhone device — the
  // dashboard-upgrade visual pass (stat cards grid, sparkline bars) is new
  // since this phase was first scoped and needs its own narrow-viewport check.
  test.use({ storageState: path.join(__dirname, '.auth', 'professor.json') });

  const id = testId();
  const svc = serviceClient();
  let db: pg.Client;
  let clubId: string;
  let eventId: string;

  test.beforeAll(async () => {
    db = await connect();
    const { data: club, error: clubErr } = await svc
      .from('clubs')
      .insert({ name: `Phase 2 Dash Club ${id}`, slug: `phase2-dash-club-${id}` })
      .select('id')
      .single();
    if (clubErr) throw clubErr;
    clubId = club!.id;

    const { data: event, error: eventErr } = await svc
      .from('events')
      .insert({
        name: `Phase 2 Dash Event ${id}`,
        type: 'standard_meeting',
        event_date: new Date(Date.now() + 3600_000).toISOString(),
        joule_value: 10,
        club_id: clubId,
      })
      .select('id')
      .single();
    if (eventErr) throw eventErr;
    eventId = event!.id;

    const { data: studentRow, error: studentErr } = await svc
      .from('students')
      .select('id')
      .eq('college_email', 'jules.demo.amp@gmail.com')
      .single();
    if (studentErr) throw studentErr;
    await asUserCommit(db, studentRow!.id, (c) => c.query('select * from register_for_event($1)', [eventId]));
  });

  test.afterAll(async () => {
    await svc.from('event_registrations').delete().eq('event_id', eventId);
    await svc.from('events').delete().eq('id', eventId);
    await svc.from('clubs').delete().eq('id', clubId);
    await db.end();
  });

  test('stat cards, sparkline, and export button all fit with no horizontal scroll', async ({ page }) => {
    await page.goto(`/admin/grid/${eventId}/registrations`);
    await expect(page.getByTestId('stat-registered')).toContainText('1');
    expect(await hasNoHorizontalScroll(page)).toBe(true);

    const exportButton = page.getByRole('button', { name: 'Export CSV' });
    const box = await exportButton.boundingBox();
    expect(box?.height, '44px minimum touch target').toBeGreaterThanOrEqual(44);
  });
});

test.describe('Committee Member: mobile Event Report flow', () => {
  const id = testId();
  const svc = serviceClient();

  let clubId: string;
  let eventId: string;
  let committeeMemberId: string;
  const email = `phase2-cm-${id}@example.com`;
  const password = `Test-${id}-Disposable!`;

  test.beforeAll(async () => {
    const { data: club, error: clubErr } = await svc
      .from('clubs')
      .insert({ name: `Phase 2 Test Club ${id}`, slug: `phase2-test-club-${id}` })
      .select('id')
      .single();
    if (clubErr) throw clubErr;
    clubId = club!.id;

    const { data: event, error: eventErr } = await svc
      .from('events')
      .insert({
        name: `Phase 2 Test Event ${id}`,
        type: 'standard_meeting',
        event_date: new Date().toISOString(),
        joule_value: 10,
        club_id: clubId,
        location: 'Seminar Hall',
      })
      .select('id')
      .single();
    if (eventErr) throw eventErr;
    eventId = event!.id;

    const { data: authUser, error: authErr } = await svc.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authErr) throw authErr;
    committeeMemberId = authUser.user!.id;

    const { error: adminErr } = await svc.from('admins').insert({
      id: committeeMemberId,
      name: `Phase 2 Test Committee Member ${id}`,
      email,
      role: 'committee_member',
      club_id: clubId,
    });
    if (adminErr) throw adminErr;
  });

  test.afterAll(async () => {
    await svc.from('event_reports').delete().eq('event_id', eventId);
    await svc.from('events').delete().eq('id', eventId);
    await svc.auth.admin.deleteUser(committeeMemberId); // cascades to admins row
    await svc.from('clubs').delete().eq('id', clubId);
  });

  test('logs in, opens a direct event link, writes and publishes a real report with an attachment, all on a phone viewport', async ({
    page,
  }) => {
    await page.goto('/admin/login');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: 'Enter' }).click();
    // AdminHomePage (Server Component) redirects a committee_member to
    // /admin/grid — waiting for the intermediate /admin URL alone resolves
    // before that server redirect actually finishes, racing the next goto().
    await page.waitForURL('**/admin/grid');

    // The direct-link deep link the professor's original ask was really
    // after — the event should already be selected, no hunting in the picker.
    await page.goto(`/admin/event-reports/new?event=${eventId}`);
    expect(await hasNoHorizontalScroll(page)).toBe(true);
    await expect(page.getByRole('combobox')).toHaveValue(eventId);
    await expect(page.getByText('Seminar Hall')).toBeVisible();

    // BulletListField's remove button (Phase 2 fix: was 36px, below the
    // 44px touch-target guidance) — add a second row so a remove button
    // actually renders (it's hidden when there's only one row), confirm size.
    await page.getByRole('button', { name: 'Add coordinators' }).click();
    const removeButton = page.getByLabel('Remove coordinators item').first();
    const removeBox = await removeButton.boundingBox();
    expect(removeBox?.height, '44px minimum touch target').toBeGreaterThanOrEqual(44);
    expect(removeBox?.width, '44px minimum touch target').toBeGreaterThanOrEqual(44);
    await removeButton.click(); // back to one row, keep the form simple below

    await page.locator('input[name="coordinators"]').first().fill('Phase 2 Test Coordinator');
    await page.locator('textarea[name="introduction"]').fill('A real end-to-end test of the mobile report flow.');
    await page.locator('input[name="objectives"]').first().fill('Prove this works on a phone.');
    await page.locator('textarea[name="event_highlights"]').fill('Everything rendered and worked on a narrow viewport.');
    await page.locator('input[name="outcomes"]').first().fill('Confirmed mobile usability end to end.');
    await page.locator('textarea[name="conclusion"]').fill('The flow is usable on a phone.');

    // A real image, not a fake file — confirms the actual upload path works,
    // not just that the input accepts a selection.
    await page
      .locator('input[name="attachment_attendance_list"]')
      .setInputFiles(path.join(__dirname, '../../../public/icons/icon-192.png'));

    await page.getByRole('button', { name: 'Publish' }).click();
    await page.waitForURL('**/admin/event-reports');
    // Title is auto-derived from the event's own name, so it appears twice
    // (the report title line + the event-name sub-line) — .first() is fine,
    // the point is confirming it's there at all, not which occurrence.
    await expect(page.getByText(`Phase 2 Test Event ${id}`).first()).toBeVisible();
  });
});
