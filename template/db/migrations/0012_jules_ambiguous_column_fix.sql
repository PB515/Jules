-- 0012_jules_ambiguous_column_fix — a real bug class caught during live
-- verification, affecting TWO functions, not just one.
--
-- Root cause: `returns table (id uuid, ...)` implicitly declares EVERY output
-- column (here, `id`) as a PL/pgSQL variable in scope for the whole function
-- body. Any later unqualified `where id = ...` against a real table that also
-- has an `id` column is then genuinely ambiguous to Postgres — it can't tell
-- whether you mean the OUT variable or the table column — and errors with
-- "column reference \"id\" is ambiguous" on every single call.
--
-- Two functions had this: `live_round_question` (caught first — the Live
-- Round team screen went blank after every phase change) and, discovered by
-- auditing every other `returns table` function for the same shape,
-- `start_surge` — meaning the ORIGINAL async Surge Mode has been unable to
-- start a single Surge since it was built; it was never actually exercised
-- live until this session. Every other `returns table` function was checked
-- and is safe (either no OUT column is literally named `id`, or every
-- reference in the body is already alias-qualified).
--
-- Fix: qualify the table reference explicitly in both.

-- migrate:up

create or replace function public.start_surge(p_surge_id uuid)
returns table (
  id uuid, text text, option_a text, option_b text, option_c text, option_d text,
  time_limit_seconds integer, order_index integer, already_answered boolean
)
language plpgsql security definer set search_path = public
as $$
declare
  v_status text;
begin
  if not exists (select 1 from students where students.id = auth.uid()) then
    raise exception 'not a student';
  end if;
  select status into v_status from surges where surges.id = p_surge_id;
  if v_status is null then
    raise exception 'surge not found';
  end if;
  if v_status <> 'live' then
    raise exception 'surge is not live';
  end if;

  return query
    select q.id, q.text, q.option_a, q.option_b, q.option_c, q.option_d,
           q.time_limit_seconds, q.order_index,
           exists (
             select 1 from surge_answers sa
             where sa.student_id = auth.uid() and sa.question_id = q.id
           )
    from questions q
    where q.surge_id = p_surge_id
    order by q.order_index;
end;
$$;

create or replace function public.live_round_question(p_round_id uuid)
returns table (
  id uuid, text text, option_a text, option_b text, option_c text, option_d text,
  time_limit_seconds integer, correct_option text, phase text, question_index integer
)
language plpgsql security definer set search_path = public
as $$
declare
  v_round live_rounds;
  v_team_exists boolean;
begin
  select * into v_round from live_rounds where live_rounds.id = p_round_id;
  if v_round.id is null then
    raise exception 'round not found';
  end if;

  select exists (
    select 1 from live_round_teams where round_id = p_round_id and student_id = auth.uid()
  ) into v_team_exists;
  if not v_team_exists then
    raise exception 'you have not joined this round';
  end if;

  return query
    select
      q.id, q.text, q.option_a, q.option_b, q.option_c, q.option_d, q.time_limit_seconds,
      case when v_round.phase in ('reveal', 'leaderboard', 'complete') then q.correct_option else null end,
      v_round.phase, v_round.question_index
    from questions q
    where q.surge_id = v_round.surge_id
    order by q.order_index
    offset v_round.question_index limit 1;
end;
$$;

-- migrate:down
-- No-op: 0006's and 0011's own down migrations already drop these functions
-- entirely; this migration only ever changed their bodies via CREATE OR REPLACE.
