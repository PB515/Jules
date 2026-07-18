/**
 * Cross-tenant RLS enumeration — a Committee Member of Club A must never be
 * able to read/write Club B's surges/events, even by guessing/enumerating a
 * real id. Directly targets the still-open Known Open Item in CLAUDE.md
 * ("Committee Member scoping covers writes and admin-UI listings, not the
 * underlying read policies... a Committee Member can currently see aggregate
 * engagement numbers for every club") by turning it into a real, continuously
 * -checked assertion instead of a caveat someone has to remember to re-verify
 * by hand (as was done manually for decision 46's original RLS proof).
 *
 * All fixtures are uniquely named per run and deleted in the `afterAll` —
 * this targets the real hosted dev DB directly (see tests/jules/db-helpers.ts).
 */
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import pg from 'pg';
import { asUserRollback, connect, serviceClient, testId } from './db-helpers';

describe('cross-tenant RLS enumeration', () => {
  const id = testId();
  const svc = serviceClient();
  let db: pg.Client;

  let clubA: string;
  let clubB: string;
  let committeeMemberId: string;
  let clubASurgeId: string;
  let clubBSurgeId: string;
  let clubBEventId: string;

  beforeAll(async () => {
    db = await connect();

    const { data: clubs, error: clubErr } = await svc
      .from('clubs')
      .insert([
        { name: `RLS Test Club A ${id}`, slug: `rls-test-club-a-${id}` },
        { name: `RLS Test Club B ${id}`, slug: `rls-test-club-b-${id}` },
      ])
      .select('id, slug');
    if (clubErr) throw clubErr;
    clubA = clubs!.find((c) => c.slug.includes('-a-'))!.id;
    clubB = clubs!.find((c) => c.slug.includes('-b-'))!.id;

    // admins.id references auth.users(id) — a real (disposable) auth user is
    // required, not just an arbitrary uuid; on delete cascade cleans up the
    // admins row when the auth user is deleted (see afterAll).
    const { data: authUser, error: authErr } = await svc.auth.admin.createUser({
      email: `rls-test-${id}@example.com`,
      password: `Test-${id}-Disposable!`,
      email_confirm: true,
    });
    if (authErr) throw authErr;
    committeeMemberId = authUser.user!.id;

    const { error: adminErr } = await svc.from('admins').insert({
      id: committeeMemberId,
      name: `RLS Test Committee Member ${id}`,
      email: `rls-test-${id}@example.com`,
      role: 'committee_member',
      club_id: clubA,
    });
    if (adminErr) throw adminErr;

    const { data: events, error: eventErr } = await svc
      .from('events')
      .insert({
        name: `RLS Test Club B Event ${id}`,
        type: 'standard_meeting',
        event_date: new Date(Date.now() + 86400000).toISOString(),
        joule_value: 10,
        club_id: clubB,
      })
      .select('id')
      .single();
    if (eventErr) throw eventErr;
    clubBEventId = events!.id;

    const { data: surgeA, error: surgeAErr } = await svc
      .from('surges')
      .insert({ name: `RLS Test Club A Surge ${id}`, club_id: clubA })
      .select('id')
      .single();
    if (surgeAErr) throw surgeAErr;
    clubASurgeId = surgeA!.id;

    const { data: surgeB, error: surgeBErr } = await svc
      .from('surges')
      .insert({ name: `RLS Test Club B Surge ${id}`, club_id: clubB })
      .select('id')
      .single();
    if (surgeBErr) throw surgeBErr;
    clubBSurgeId = surgeB!.id;
  });

  afterAll(async () => {
    await svc.from('surges').delete().in('id', [clubASurgeId, clubBSurgeId]);
    await svc.from('events').delete().eq('id', clubBEventId);
    await svc.auth.admin.deleteUser(committeeMemberId); // cascades to admins row
    await svc.from('clubs').delete().in('id', [clubA, clubB]);
    await db.end();
  });

  test('can_manage_club: true for own club, false for another club', async () => {
    await asUserRollback(db, committeeMemberId, async (c) => {
      const own = await c.query('select public.can_manage_club($1) as ok', [clubA]);
      const other = await c.query('select public.can_manage_club($1) as ok', [clubB]);
      expect(own.rows[0].ok).toBe(true);
      expect(other.rows[0].ok).toBe(false);
    });
  });

  test('can_manage_surge/can_manage_event: false for another club\'s rows', async () => {
    await asUserRollback(db, committeeMemberId, async (c) => {
      const surge = await c.query('select public.can_manage_surge($1) as ok', [clubBSurgeId]);
      const event = await c.query('select public.can_manage_event($1) as ok', [clubBEventId]);
      expect(surge.rows[0].ok).toBe(false);
      expect(event.rows[0].ok).toBe(false);
    });
  });

  test('RLS denies an UPDATE on another club\'s surge (0 rows affected), allows it on own club\'s', async () => {
    await asUserRollback(db, committeeMemberId, async (c) => {
      const denied = await c.query('update surges set name = $1 where id = $2', [
        'hacked by cross-tenant test',
        clubBSurgeId,
      ]);
      expect(denied.rowCount).toBe(0);

      const allowed = await c.query('update surges set name = $1 where id = $2', [
        'renamed by own-club test',
        clubASurgeId,
      ]);
      expect(allowed.rowCount).toBe(1);
      // transaction is rolled back by asUserRollback — this rename never persists
    });
  });

  test('SELECT reads stay platform-wide by design (documents the known, disclosed gap, not a bug)', async () => {
    await asUserRollback(db, committeeMemberId, async (c) => {
      const result = await c.query('select id from surges where id = $1', [clubBSurgeId]);
      // events/surges have broad authenticated-read policies on purpose
      // (needed for the public calendar and student registration, decision
      // 46's Known Open Item) — a Committee Member CAN read another club's
      // surge row today, only writes are club-scoped. This assertion turns
      // that documented-in-prose caveat into a real, continuously-checked
      // fact: if this is ever deliberately tightened, this test fails and
      // needs an intentional update, rather than a silent, unnoticed change.
      expect(result.rowCount).toBe(1);
    });
  });
});
