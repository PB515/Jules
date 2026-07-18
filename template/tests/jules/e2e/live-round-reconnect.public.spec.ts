import { test, expect, type Browser } from '@playwright/test';
import path from 'node:path';
import pg from 'pg';
import { asUserCommit, connect, serviceClient, testId } from '../db-helpers';

/**
 * Multi-team Live Round reconnect (plan scenario 1) — the flagship scenario
 * this whole initiative was motivated by ("the exact 'all my test tabs
 * share one cookie jar' limitation hit repeatedly this session trying to
 * test multi-student Live Round scenarios by hand"). Three real students,
 * one real host, driven concurrently via separate browser contexts +
 * storageState, per the plan's own documented pattern — not separate
 * workers (those don't interact), real `browser.newContext()` calls inside
 * one test.
 *
 * Fixture setup (surge/questions/round) goes through the real
 * SECURITY DEFINER RPCs under a faked session (asUserCommit against a raw
 * Postgres connection), not a raw table insert — database.types.ts
 * deliberately types these tables' Insert as `never` to force real app
 * code through the RPCs, and this exercises the real room_code generation
 * + phase machinery rather than reimplementing it.
 *
 * Targets the reconnect/resync bug class behind decisions 36/60/77: no
 * explicit "you're offline" UI exists anywhere in this app (confirmed by
 * research — both host-client.tsx and team-client.tsx rely entirely on
 * Realtime's built-in auto-reconnect plus a mount-time fetch), so the only
 * way to prove resync actually works is to force a disconnect, force the
 * round to move on without the disconnected student, restore the
 * connection with a fresh page load, and assert the DOM lands on the real
 * current phase rather than something stale.
 */
const authDir = path.join(__dirname, '.auth');

async function contextFor(browser: Browser, authFile: string) {
  return browser.newContext({ storageState: path.join(authDir, authFile) });
}

test.describe('Live Round: multi-team join, mid-round reconnect, completion', () => {
  const id = testId();
  const svc = serviceClient();
  let db: pg.Client;

  let clubId: string;
  let professorId: string;
  let voltId: string;
  let ampId: string;
  let surgeId: string;
  let roundId: string;
  let roomCode: string;

  test.beforeAll(async () => {
    db = await connect();

    const { data: club, error: clubErr } = await svc
      .from('clubs')
      .insert({ name: `Live Round Test Club ${id}`, slug: `live-round-test-club-${id}` })
      .select('id')
      .single();
    if (clubErr) throw clubErr;
    clubId = club!.id;

    const { data: profRow, error: profErr } = await svc.from('admins').select('id').eq('email', 'jules.owner.demo@gmail.com').single();
    if (profErr) throw profErr;
    professorId = profRow!.id;

    const { data: voltRow, error: voltErr } = await svc.from('students').select('id').eq('college_email', 'jules.demo.volt@gmail.com').single();
    if (voltErr) throw voltErr;
    voltId = voltRow!.id;

    const { data: ampRow, error: ampErr } = await svc.from('students').select('id').eq('college_email', 'jules.demo.amp@gmail.com').single();
    if (ampErr) throw ampErr;
    ampId = ampRow!.id;

    const { data: surge, error: surgeErr } = await svc
      .from('surges')
      .insert({ name: `Live Round Test Surge ${id}`, club_id: clubId, points_per_question: 20, created_by: professorId })
      .select('id')
      .single();
    if (surgeErr) throw surgeErr;
    surgeId = surge!.id;

    const { error: qErr } = await svc.from('questions').insert([
      {
        surge_id: surgeId,
        text: `LR test Q1 ${id}`,
        option_a: 'Joule',
        option_b: 'Watt',
        option_c: 'Volt',
        option_d: 'Ohm',
        correct_option: 'A',
        order_index: 0,
      },
      {
        surge_id: surgeId,
        text: `LR test Q2 ${id}`,
        option_a: 'Ampere',
        option_b: 'Newton',
        option_c: 'Pascal',
        option_d: 'Tesla',
        correct_option: 'A',
        order_index: 1,
      },
    ]);
    if (qErr) throw qErr;

    const roundResult = await asUserCommit(db, professorId, (c) => c.query('select * from host_create_round($1)', [surgeId]));
    roundId = roundResult.rows[0].id;
    roomCode = roundResult.rows[0].room_code;
  });

  test.afterAll(async () => {
    await svc.from('live_round_answers').delete().eq('round_id', roundId);
    await svc.from('live_round_team_members').delete().eq('round_id', roundId);
    await svc.from('live_round_teams').delete().eq('round_id', roundId);
    await svc.from('live_rounds').delete().eq('id', roundId);
    await svc.from('joule_transactions').delete().eq('surge_id', surgeId);
    await svc.from('questions').delete().eq('surge_id', surgeId);
    await svc.from('surges').delete().eq('id', surgeId);
    await svc.from('clubs').delete().eq('id', clubId);
    await db.end();
  });

  test('volt forms a team, amp joins, amp drops and reconnects mid-round, round completes with a real score', async ({ browser }) => {
    // 3 real contexts, ~15 sequential UI steps, plus the milestone reveal's
    // ~6.5s suspense delay on the final question — well past the 30s default.
    test.setTimeout(120_000);

    const hostCtx = await contextFor(browser, 'professor.json');
    const voltCtx = await contextFor(browser, 'student-volt.json');
    const ampCtx = await contextFor(browser, 'student-amp.json');
    const host = await hostCtx.newPage();
    const volt = await voltCtx.newPage();
    const amp = await ampCtx.newPage();

    // --- Team formation: volt captains, amp joins the same team ---
    await volt.goto(`/live?code=${roomCode}`);
    await volt.getByRole('button', { name: 'Continue' }).click();
    await volt.waitForURL(`**/live/${roundId}`);
    await volt.getByRole('button', { name: '+ Start a team' }).click();
    await volt.getByPlaceholder('Team name').fill(`Reconnect Test Team ${id}`);
    await volt.getByRole('button', { name: 'Create' }).click();
    await expect(volt.getByText("You're in!")).toBeVisible();

    await amp.goto(`/live?code=${roomCode}`);
    await amp.getByRole('button', { name: 'Continue' }).click();
    await amp.waitForURL(`**/live/${roundId}`);
    await amp.getByRole('button', { name: 'Join' }).click();
    await expect(amp.getByText("You're in!")).toBeVisible();

    // --- Host confirms the lobby sees both members, starts the round ---
    await host.goto(`/admin/live/${roundId}`);
    await expect(host.getByText('1 team, 2 students joined')).toBeVisible();
    await host.getByRole('button', { name: 'Start round' }).click();

    // --- amp drops mid-round, right as question 1 goes live ---
    await ampCtx.setOffline(true);

    // volt (captain) answers Q1 correctly while amp is offline
    await expect(volt.getByRole('button', { name: /^A\./, exact: false })).toBeVisible();
    await volt.getByRole('button', { name: /^A\./, exact: false }).click();
    await expect(volt.getByText('Locked in, waiting for the host…')).toBeVisible();

    // Host advances all the way through Q1 to Q2 while amp is still offline.
    await host.getByRole('button', { name: 'Reveal answer' }).click();
    await expect(host.getByText('Correct answers earn +20 J')).toBeVisible();
    await host.getByRole('button', { name: 'Show scoreboard' }).click();
    // The leaderboard view (Scoreboard() in host-client.tsx) is a plain <ul>
    // with no heading text — assert on the real team row instead.
    await expect(host.getByText(`Reconnect Test Team ${id}`)).toBeVisible();
    await host.getByRole('button', { name: 'Next question' }).click();

    // --- amp reconnects: restore network + reload (the one guaranteed resync path) ---
    await ampCtx.setOffline(false);
    await amp.reload();
    // amp was never the captain, so it never answers — it should just land
    // on whatever phase the round is actually in now (question 2), not
    // stuck on the question-1 lobby state it last saw before dropping.
    await expect(amp.getByText('Your team captain is answering for the team.')).toBeVisible();

    // volt answers Q2 correctly, host finishes the round
    await expect(volt.getByRole('button', { name: /^A\./, exact: false })).toBeVisible();
    await volt.getByRole('button', { name: /^A\./, exact: false }).click();
    await host.getByRole('button', { name: 'Reveal answer' }).click();
    // Q2 is the final question — hits the ~6.5s milestone suspense delay
    // (drumroll) on both host and student screens before real content renders.
    await expect(host.getByText('Correct answers earn +20 J')).toBeVisible({ timeout: 10_000 });
    await host.getByRole('button', { name: 'Show scoreboard' }).click();
    await host.getByRole('button', { name: 'Finish round' }).click();

    // --- Final assertions: both host and every student land on real completion, DB has a real score ---
    await expect(host.getByText('Final standings')).toBeVisible();
    await expect(volt.getByText('Final standings')).toBeVisible({ timeout: 10_000 });
    // amp reconnected mid-round and never explicitly reloaded again after
    // question 2 started — this is the actual proof its earlier resync
    // wasn't a one-off: the SAME realtime subscription that picked up
    // question 2 also carries it through reveal/leaderboard/complete.
    await expect(amp.getByText('Final standings')).toBeVisible({ timeout: 10_000 });

    const scoreboard = await db.query('select * from live_round_scoreboard($1)', [roundId]);
    expect(scoreboard.rows.length).toBe(1);
    expect(scoreboard.rows[0].total_amount).toBeGreaterThan(0);

    const { data: transactions } = await svc.from('joule_transactions').select('id, student_id, amount').eq('surge_id', surgeId);
    // Pooled across both roster members (decision 49's split model) — both
    // volt and amp should have been credited, not just the captain who
    // physically clicked the answer buttons.
    const creditedStudents = new Set((transactions ?? []).map((t) => t.student_id));
    expect(creditedStudents.has(voltId)).toBe(true);
    expect(creditedStudents.has(ampId)).toBe(true);

    await hostCtx.close();
    await voltCtx.close();
    await ampCtx.close();
  });
});
