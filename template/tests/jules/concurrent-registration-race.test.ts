/**
 * Concurrent registration / QR-scan race (plan scenario 5) — fires several
 * simultaneous calls to register_for_event / redeem_event_scan for the same
 * student+event, confirms exactly-once semantics: exactly one call succeeds,
 * the rest get the RPC's own conflict error, and the real committed state
 * (not just the response) has exactly one row.
 *
 * Genuine concurrency needs N separate DB connections (one pg.Client can
 * only run one transaction at a time) and each connection must commit/
 * rollback on its OWN, immediately after its own RPC call resolves — not
 * deferred until all N results are collected, which would deadlock (the
 * losing connections block on Postgres's unique-index lock until the
 * winner commits, and nothing else in this script does that on their
 * behalf). See asUserCommit in db-helpers.ts.
 *
 * All fixtures are uniquely named per run and deleted in afterAll — this
 * targets the real hosted dev DB directly (see tests/jules/db-helpers.ts).
 */
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import pg from 'pg';
import { asUserCommit, connect, serviceClient, testId } from './db-helpers';

const CONCURRENCY = 5;

describe('concurrent registration / QR-scan race', () => {
  const id = testId();
  const svc = serviceClient();
  let rawDb: pg.Client; // unrestricted connection (DATABASE_URL's own role) — used to compute a real QR token, which students have no direct grant to compute themselves

  let clubId: string;
  let studentId: string;
  let eventId: string;
  let qrToken: string;

  beforeAll(async () => {
    rawDb = await connect();

    const { data: club, error: clubErr } = await svc
      .from('clubs')
      .insert({ name: `Race Test Club ${id}`, slug: `race-test-club-${id}` })
      .select('id')
      .single();
    if (clubErr) throw clubErr;
    clubId = club!.id;

    const { data: authUser, error: authErr } = await svc.auth.admin.createUser({
      email: `race-test-${id}@gmail.com`,
      password: `Test-${id}-Disposable!`,
      email_confirm: true,
    });
    if (authErr) throw authErr;
    studentId = authUser.user!.id;

    const { error: studentErr } = await svc.from('students').insert({
      id: studentId,
      name: `Race Test Student ${id}`,
      college_email: `race-test-${id}@gmail.com`,
    });
    if (studentErr) throw studentErr;

    const now = new Date();
    const { data: event, error: eventErr } = await svc
      .from('events')
      .insert({
        name: `Race Test Event ${id}`,
        type: 'standard_meeting',
        event_date: now.toISOString(),
        end_date: new Date(now.getTime() + 3600_000).toISOString(),
        joule_value: 10,
        club_id: clubId,
      })
      .select('id')
      .single();
    if (eventErr) throw eventErr;
    eventId = event!.id;

    // qr_token_for_epoch/qr_epoch have no `authenticated` grant (only
    // security-definer RPCs like redeem_event_scan can call them
    // internally) — compute it via the unrestricted raw connection instead.
    const tokenResult = await rawDb.query(
      'select public.qr_token_for_epoch($1, public.qr_epoch()) as token',
      [eventId]
    );
    qrToken = tokenResult.rows[0].token;
  });

  afterAll(async () => {
    await svc.from('joule_transactions').delete().eq('event_id', eventId);
    await svc.from('event_registrations').delete().eq('event_id', eventId);
    await svc.from('events').delete().eq('id', eventId);
    await svc.auth.admin.deleteUser(studentId); // cascades to students row
    await svc.from('clubs').delete().eq('id', clubId);
    await rawDb.end();
  });

  test('register_for_event: exactly one of N concurrent calls succeeds', async () => {
    const clients = await Promise.all(Array.from({ length: CONCURRENCY }, () => connect()));
    try {
      const results = await Promise.allSettled(
        clients.map((c) => asUserCommit(c, studentId, (cc) => cc.query('select * from register_for_event($1)', [eventId])))
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(CONCURRENCY - 1);
      for (const r of rejected as PromiseRejectedResult[]) {
        expect(String(r.reason)).toContain('already registered for this event');
      }

      const { data: rows } = await svc.from('event_registrations').select('id').eq('event_id', eventId).eq('student_id', studentId);
      expect(rows?.length).toBe(1);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  test('redeem_event_scan: exactly one of N concurrent calls is credited', async () => {
    const clients = await Promise.all(Array.from({ length: CONCURRENCY }, () => connect()));
    try {
      const results = await Promise.allSettled(
        clients.map((c) =>
          asUserCommit(c, studentId, (cc) => cc.query('select * from redeem_event_scan($1, $2)', [eventId, qrToken]))
        )
      );

      const fulfilled = results.filter((r): r is PromiseFulfilledResult<pg.QueryResult> => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(CONCURRENCY - 1);
      for (const r of rejected as PromiseRejectedResult[]) {
        expect(String(r.reason)).toContain('already credited for this event');
      }
      expect(fulfilled[0].value.rows[0].amount).toBe(10);

      const { data: rows } = await svc
        .from('joule_transactions')
        .select('id')
        .eq('event_id', eventId)
        .eq('student_id', studentId)
        .eq('type', 'event_scan');
      expect(rows?.length).toBe(1);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });
});
