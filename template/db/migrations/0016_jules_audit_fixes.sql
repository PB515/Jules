-- 0016_jules_audit_fixes — three more findings from the same harsh security
-- retrospective that produced 0015. Ordered by severity.

-- migrate:up

-- ---------- 1. Live Round question-index bypass (moderate: game integrity) ----------
-- submit_live_answer() validated that a question belonged to the round's
-- surge, but never that it was the round's CURRENT question. A team could
-- skip an early question, watch the host reveal its correct answer to the
-- room, then submit that (now-known) answer during ANY later question's
-- live window — the RPC would accept it as a normal, on-time correct
-- answer. Fixed by scoping the lookup to the exact question at
-- question_index, not "any question in the surge."
create or replace function public.submit_live_answer(
  p_round_id uuid,
  p_question_id uuid,
  p_selected_option text,
  p_response_time_ms integer default null
)
returns table (correct boolean, correct_option text, awarded integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_round live_rounds;
  v_team live_round_teams;
  v_question questions;
  v_correct boolean;
  v_points integer;
begin
  select * into v_team from live_round_teams where round_id = p_round_id and student_id = auth.uid();
  if v_team.id is null then
    raise exception 'you have not joined this round';
  end if;

  select * into v_round from live_rounds where id = p_round_id;
  if v_round.phase <> 'question' then
    raise exception 'this question is not open right now';
  end if;

  -- The one substantive change: scoped by order_index = question_index, not
  -- just "belongs to this surge" — so an answer can only ever be submitted
  -- for the question the room is actually looking at right now.
  select * into v_question from questions
  where surge_id = v_round.surge_id and order_index = v_round.question_index;
  if v_question.id is null or v_question.id <> p_question_id then
    raise exception 'that is not the current question';
  end if;
  if p_selected_option not in ('A', 'B', 'C', 'D') then
    raise exception 'invalid option';
  end if;

  v_correct := (p_selected_option = v_question.correct_option);
  select points_per_question into v_points from surges where id = v_round.surge_id;

  begin
    insert into live_round_answers (round_id, team_id, question_id, selected_option, correct, response_time_ms)
    values (p_round_id, v_team.id, p_question_id, p_selected_option, v_correct, p_response_time_ms);
  exception when unique_violation then
    raise exception 'already answered';
  end;

  if v_correct then
    insert into joule_transactions (student_id, surge_id, question_id, amount, type, response_time_ms)
    values (auth.uid(), v_round.surge_id, p_question_id, v_points, 'surge_correct_answer', p_response_time_ms);
    perform public._bump_streak(auth.uid());
  end if;

  return query select v_correct, v_question.correct_option, case when v_correct then v_points else 0 end;
end;
$$;

-- ---------- 2. RBAC helpers had no explicit grants at all (low: least-privilege) ----------
-- is_admin/admin_role/is_owner/is_officer_or_owner/is_volunteer_for_event
-- (0004) never had a `revoke`/`grant` pair, unlike every other helper in
-- that file and the project's own has_role.sql reference pattern — meaning
-- they carried Postgres's default PUBLIC execute grant. Confirmed callable
-- by a fully anonymous caller (returning false/null, since they're all
-- self-referential to auth.uid()) — not a data leak on their own, but a
-- real inconsistency with the stated "internal helper, not exposed"
-- intent, and needless attack surface. Fixed the same way has_role.sql
-- does it: revoke from PUBLIC, re-grant to `authenticated` specifically —
-- NOT also revoking from authenticated, since RLS policies across nearly
-- every table in this project call these functions directly in their
-- USING/WITH CHECK clauses, evaluated as the querying (authenticated) role,
-- not the function owner. Getting this wrong would break RLS everywhere.
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.admin_role() from public;
grant execute on function public.admin_role() to authenticated;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

revoke all on function public.is_officer_or_owner() from public;
grant execute on function public.is_officer_or_owner() to authenticated;

revoke all on function public.is_volunteer_for_event(uuid) from public;
grant execute on function public.is_volunteer_for_event(uuid) to authenticated;

-- migrate:down
-- No-op: 0004's and 0010's own down migrations already drop these
-- functions entirely; this migration only ever changed grants/bodies.
