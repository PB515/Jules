import { test, expect } from '@playwright/test';
import pg from 'pg';
import { asUserCommit, connect, serviceClient, testId } from '../db-helpers';

/**
 * Professor live registrations view (Phase 1 of "Professor live
 * registrations + mobile-friendly coordinator report writing + richer
 * Event Report doc"). The actual feature under test is realtime: the page
 * must update the instant a registration or unregistration happens
 * elsewhere, with zero manual reload — that's the whole point of the
 * feature, not just "the list renders."
 *
 * Fixture setup goes through the real register_for_event/
 * unregister_from_event RPCs under a faked session (asUserCommit), not raw
 * table inserts — database.types.ts types event_registrations' Insert as
 * `never` to force real app code through the RPC, same convention as the
 * other scenarios in this suite.
 *
 * Serial, not parallel: both tests below manipulate registration state for
 * the same student+event (shared fixtures set up once in beforeAll) — under
 * Playwright's default fullyParallel, the two tests' register/unregister
 * calls raced each other and corrupted each other's expected counts. This
 * was the actual cause of intermittent failures seen while building this
 * test, not a real app bug (confirmed by running each test alone, which
 * passed consistently).
 */
test.describe.configure({ mode: 'serial' });

test.describe('Professor live registrations view', () => {
  const id = testId();
  const svc = serviceClient();
  let db: pg.Client;

  let clubId: string;
  let eventId: string;
  let studentId: string;

  test.beforeAll(async () => {
    db = await connect();

    const { data: club, error: clubErr } = await svc
      .from('clubs')
      .insert({ name: `Live Reg Test Club ${id}`, slug: `live-reg-test-club-${id}` })
      .select('id')
      .single();
    if (clubErr) throw clubErr;
    clubId = club!.id;

    const now = new Date();
    const { data: event, error: eventErr } = await svc
      .from('events')
      .insert({
        name: `Live Reg Test Event ${id}`,
        type: 'standard_meeting',
        event_date: new Date(now.getTime() + 3600_000).toISOString(),
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
      .eq('college_email', 'jules.demo.volt@gmail.com')
      .single();
    if (studentErr) throw studentErr;
    studentId = studentRow!.id;
  });

  test.afterAll(async () => {
    await svc.from('event_registrations').delete().eq('event_id', eventId);
    await svc.from('events').delete().eq('id', eventId);
    await svc.from('clubs').delete().eq('id', clubId);
    await db.end();
  });

  test('a new registration appears live, with zero manual reload', async ({ page }) => {
    await page.goto(`/admin/grid/${eventId}/registrations`);
    await expect(page.getByText('0 registered')).toBeVisible();
    await expect(page.getByText('No registrations yet')).toBeVisible();

    // A student registers elsewhere, while the professor's page is already
    // open — the real thing this feature exists to prove.
    await asUserCommit(db, studentId, (c) => c.query('select * from register_for_event($1)', [eventId]));

    await expect(page.getByText('1 registered')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Demo Volt')).toBeVisible();
    await expect(page.getByText('jules.demo.volt@gmail.com')).toBeVisible();
  });

  test('an unregistration disappears live, with zero manual reload', async ({ page }) => {
    await asUserCommit(db, studentId, (c) => c.query('select unregister_from_event($1)', [eventId]));
    // Re-register for this test's own setup, then confirm removing it live works.
    await asUserCommit(db, studentId, (c) => c.query('select * from register_for_event($1)', [eventId]));

    await page.goto(`/admin/grid/${eventId}/registrations`);
    await expect(page.getByText('1 registered')).toBeVisible();
    await expect(page.getByText('Demo Volt')).toBeVisible();

    await asUserCommit(db, studentId, (c) => c.query('select unregister_from_event($1)', [eventId]));

    await expect(page.getByText('0 registered')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('No registrations yet')).toBeVisible();
  });
});
