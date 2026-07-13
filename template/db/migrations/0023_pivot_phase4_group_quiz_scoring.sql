-- 0023_pivot_phase4_group_quiz_scoring — Pivot Phase 4 (CLAUDE.md decision
-- 45/49), the largest single mechanic in the pivot: group/individual quiz
-- registration with pooled scoring, plus negative marking and time-based
-- marking for every quiz answer (async Surge Mode AND Live Round).
--
-- Confirmed with the user before writing any of this (four AskUserQuestion
-- rounds, all "Recommended" picked): pooled points that don't divide evenly
-- round down, with the leftover distributed one point at a time to the
-- fastest answerers; the time bonus is a continuous formula
-- (base_points * remaining_time/time_limit); negative marking is a flat,
-- per-Surge-configurable penalty per wrong answer; Committee Members can
-- configure all of this themselves, same access as any other Surge.
--
-- Scope, confirmed against the plan's own wording: group registration and
-- pooled/split scoring apply ONLY to async Surge Mode — every member
-- answers individually on their own device, and the group's combined
-- result is redistributed once the Surge closes. Live Round keeps its
-- existing "one device per team" real-time model entirely (decision 24);
-- it only picks up the new time-weighted/negative-marking FORMULA, not the
-- group-pooling mechanism, since a Live Round team already has exactly one
-- ledger to credit (whoever holds the device).
--
-- Architecture: registering as a group is optional ("a group of 1" is
-- solo, per the plan's own framing) and locked to `surges.status = 'draft'`
-- — once a Surge goes live the roster is fixed, matching the existing
-- prefetch-once architecture (decision 8). Scoring for async Surge Mode
-- moves from real-time per-answer crediting to a single finalization pass
-- (`complete_surge()`) that runs when the Surge closes — `submit_surge_answer`
-- still returns an instant correct/incorrect + computed-points preview for
-- the quiz UI, it just no longer writes the ledger itself. Live Round is
-- unaffected by this timing change; it still credits every answer live.

-- migrate:up

-- ---------- surges: new scoring configuration ----------

alter table surges add column if not exists participation_points_per_question integer not null default 5
  check (participation_points_per_question >= 0);
alter table surges add column if not exists negative_points_per_wrong_answer integer not null default 0
  check (negative_points_per_wrong_answer >= 0);

-- ---------- quiz_groups / quiz_group_members ----------

create table if not exists quiz_groups (
  id         uuid primary key default gen_random_uuid(),
  surge_id   uuid not null references surges(id),
  name       text not null check (char_length(name) between 1 and 60),
  created_by uuid not null references students(id),
  created_at timestamptz not null default now(),
  unique (surge_id, name)
);
create index if not exists idx_quiz_groups_surge on quiz_groups (surge_id);

-- surge_id is denormalized from quiz_groups.surge_id (set by the RPCs
-- below, never by a direct client insert) specifically so a real database
-- constraint — not just an RPC-level check — guarantees a student can never
-- belong to two different groups for the same Surge, closing a race
-- condition two concurrent join calls could otherwise hit.
create table if not exists quiz_group_members (
  group_id   uuid not null references quiz_groups(id) on delete cascade,
  surge_id   uuid not null references surges(id),
  student_id uuid not null references students(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (group_id, student_id),
  unique (surge_id, student_id)
);

alter table quiz_groups enable row level security;
alter table quiz_group_members enable row level security;

-- Group names/rosters aren't sensitive (same trust model as Live Round's
-- room-code content, decision 24) — broad read lets the join-a-group screen
-- list every open group for a Surge. No direct write policies: the RPCs
-- below are the only writers.
create policy "authenticated reads quiz groups" on quiz_groups
  for select using (auth.uid() is not null);
create policy "authenticated reads quiz group members" on quiz_group_members
  for select using (auth.uid() is not null);

-- ---------- joule_transactions: rename + add transaction types ----------
-- 'surge_correct_answer' is renamed to 'surge_earned' since it no longer
-- means literally "one row per correct answer" for async Surge Mode (it's
-- now a single pooled-and-split amount per student per Surge, credited at
-- close) — Live Round keeps crediting per-answer, but the name still fits
-- better ("earned" vs. flat "correct answer", now that a wrong answer can
-- also produce a row via negative marking). 'surge_participation' is new:
-- the separate pool credited regardless of correctness.

-- Must drop the old check constraint BEFORE writing the new type value —
-- 'surge_earned' would violate the original
-- ('event_scan','surge_correct_answer','admin_manual_adjustment')
-- constraint otherwise (the exact ordering mistake decision 46's migration
-- made and fixed; repeated here as a reminder this is now a standing rule).
alter table joule_transactions drop constraint if exists joule_transactions_type_check;

update joule_transactions set type = 'surge_earned' where type = 'surge_correct_answer';

alter table joule_transactions add constraint joule_transactions_type_check
  check (type in ('event_scan', 'surge_earned', 'surge_participation', 'admin_manual_adjustment'));

drop index if exists uq_one_answer_per_student_question;
-- Live Round still credits per-answer with a real question_id — this index
-- still protects "one earned-credit per student per question" there. The
-- new pooled rows below (question_id is null) never conflict with each
-- other under a unique index, since NULL <> NULL — that's exactly why the
-- two indexes after this one exist, to close that gap explicitly.
create unique index if not exists uq_one_earned_credit_per_student_question
  on joule_transactions (student_id, question_id) where type = 'surge_earned' and question_id is not null;

-- Defense in depth against complete_surge() ever double-crediting the same
-- student for the same Surge (on top of the row lock inside the function
-- itself, decision 5's "ledger, not a mutable balance" discipline extended
-- to the pooled-award case).
create unique index if not exists uq_one_surge_earned_pool_per_student
  on joule_transactions (student_id, surge_id) where type = 'surge_earned' and question_id is null;
create unique index if not exists uq_one_surge_participation_pool_per_student
  on joule_transactions (student_id, surge_id) where type = 'surge_participation';

-- ---------- quiz group RPCs (student-facing) ----------

create or replace function public.create_quiz_group(p_surge_id uuid, p_name text)
returns quiz_groups
language plpgsql security definer set search_path = public
as $$
declare
  v_surge surges;
  v_row quiz_groups;
begin
  if not exists (select 1 from students where id = auth.uid()) then
    raise exception 'not a student';
  end if;
  select * into v_surge from surges where id = p_surge_id;
  if v_surge.id is null then
    raise exception 'surge not found';
  end if;
  if v_surge.status <> 'draft' then
    raise exception 'this surge has already started — groups can only be formed beforehand';
  end if;
  if exists (select 1 from quiz_group_members where surge_id = p_surge_id and student_id = auth.uid()) then
    raise exception 'you are already in a group for this surge';
  end if;
  if char_length(trim(p_name)) = 0 then
    raise exception 'group name is required';
  end if;

  insert into quiz_groups (surge_id, name, created_by)
  values (p_surge_id, trim(p_name), auth.uid())
  returning * into v_row;

  insert into quiz_group_members (group_id, surge_id, student_id)
  values (v_row.id, p_surge_id, auth.uid());

  return v_row;
end;
$$;
revoke all on function public.create_quiz_group(uuid, text) from public;
grant execute on function public.create_quiz_group(uuid, text) to authenticated;

create or replace function public.join_quiz_group(p_group_id uuid)
returns quiz_group_members
language plpgsql security definer set search_path = public
as $$
declare
  v_group quiz_groups;
  v_surge surges;
  v_row quiz_group_members;
begin
  if not exists (select 1 from students where id = auth.uid()) then
    raise exception 'not a student';
  end if;
  select * into v_group from quiz_groups where id = p_group_id;
  if v_group.id is null then
    raise exception 'group not found';
  end if;
  select * into v_surge from surges where id = v_group.surge_id;
  if v_surge.status <> 'draft' then
    raise exception 'this surge has already started — groups can only be joined beforehand';
  end if;
  if exists (select 1 from quiz_group_members where surge_id = v_group.surge_id and student_id = auth.uid()) then
    raise exception 'you are already in a group for this surge';
  end if;

  insert into quiz_group_members (group_id, surge_id, student_id)
  values (p_group_id, v_group.surge_id, auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.join_quiz_group(uuid) from public;
grant execute on function public.join_quiz_group(uuid) to authenticated;

-- Leaving is only allowed before the surge goes live, same as joining. If
-- this was the group's last member, the now-empty group row is cleaned up
-- too rather than left behind as permanent litter.
create or replace function public.leave_quiz_group(p_group_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_group quiz_groups;
  v_surge surges;
begin
  select * into v_group from quiz_groups where id = p_group_id;
  if v_group.id is null then
    raise exception 'group not found';
  end if;
  select * into v_surge from surges where id = v_group.surge_id;
  if v_surge.status <> 'draft' then
    raise exception 'this surge has already started — you can no longer leave your group';
  end if;

  delete from quiz_group_members where group_id = p_group_id and student_id = auth.uid();

  if not exists (select 1 from quiz_group_members where group_id = p_group_id) then
    delete from quiz_groups where id = p_group_id;
  end if;
end;
$$;
revoke all on function public.leave_quiz_group(uuid) from public;
grant execute on function public.leave_quiz_group(uuid) to authenticated;

-- ---------- shared scoring formula ----------
-- One formula, used both for the instant per-answer preview
-- (submit_surge_answer/submit_live_answer) and for the finalize-time
-- recomputation in complete_surge() — a single source of truth rather than
-- the same math duplicated and risking drift between the two call sites.
-- A missing response_time_ms (should not normally happen) is treated as
-- "used the full time" (zero time bonus) — the conservative direction,
-- since the alternative (assume instant) would let missing data pay out
-- more than a real recorded answer ever could.
create or replace function public.surge_answer_points(
  p_correct boolean,
  p_base_points integer,
  p_negative_points integer,
  p_response_time_ms integer,
  p_time_limit_seconds integer
)
returns integer
language sql immutable
as $$
  select case
    when p_correct then
      round(
        p_base_points * greatest(0, least(1.0,
          (p_time_limit_seconds * 1000 - coalesce(p_response_time_ms, p_time_limit_seconds * 1000))::numeric
          / (p_time_limit_seconds * 1000)
        ))
      )::integer
    else
      -p_negative_points
  end;
$$;
revoke all on function public.surge_answer_points(boolean, integer, integer, integer, integer) from public;
grant execute on function public.surge_answer_points(boolean, integer, integer, integer, integer) to authenticated;

-- ---------- submit_surge_answer: instant preview only, ledger deferred to complete_surge() ----------

create or replace function public.submit_surge_answer(
  p_question_id uuid,
  p_selected_option text,
  p_response_time_ms integer default null
)
returns table (correct boolean, correct_option text, awarded integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_question questions;
  v_surge surges;
  v_correct boolean;
  v_awarded integer;
begin
  if not exists (select 1 from students where id = auth.uid()) then
    raise exception 'not a student';
  end if;
  if p_selected_option not in ('A', 'B', 'C', 'D') then
    raise exception 'invalid option';
  end if;

  select * into v_question from questions where id = p_question_id;
  if v_question.id is null then
    raise exception 'question not found';
  end if;
  select * into v_surge from surges where id = v_question.surge_id;
  if v_surge.status <> 'live' then
    raise exception 'surge is not live';
  end if;

  v_correct := (p_selected_option = v_question.correct_option);

  begin
    insert into surge_answers (student_id, question_id, selected_option, correct, response_time_ms)
    values (auth.uid(), p_question_id, p_selected_option, v_correct, p_response_time_ms);
  exception when unique_violation then
    raise exception 'already answered';
  end;

  v_awarded := public.surge_answer_points(
    v_correct, v_surge.points_per_question, v_surge.negative_points_per_wrong_answer,
    p_response_time_ms, v_question.time_limit_seconds
  );

  -- No joule_transactions write here (decision 49) — participation and
  -- earned points are pooled per group and credited once, in complete_surge(),
  -- when the Surge closes. v_awarded is an instant preview for the quiz UI only.
  return query select v_correct, v_question.correct_option, v_awarded;
end;
$$;

-- ---------- submit_live_answer: same formula, still credits in real time ----------
-- Live Round is NOT part of the group-pooling mechanic (decision 49's scope
-- note) — it keeps crediting the one student holding the team's device
-- immediately, same as before. Only the scoring math changes: time-weighted
-- correct answers instead of a flat amount, and now an actual (possibly
-- negative) ledger row for a wrong answer when the Surge has negative
-- marking configured, which today silently credited nothing at all.

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
  v_surge surges;
  v_correct boolean;
  v_awarded integer;
begin
  select * into v_team from live_round_teams where round_id = p_round_id and student_id = auth.uid();
  if v_team.id is null then
    raise exception 'you have not joined this round';
  end if;

  select * into v_round from live_rounds where id = p_round_id;
  if v_round.phase <> 'question' then
    raise exception 'this question is not open right now';
  end if;

  select * into v_question from questions
  where surge_id = v_round.surge_id and order_index = v_round.question_index;
  if v_question.id is null or v_question.id <> p_question_id then
    raise exception 'that is not the current question';
  end if;
  if p_selected_option not in ('A', 'B', 'C', 'D') then
    raise exception 'invalid option';
  end if;

  select * into v_surge from surges where id = v_round.surge_id;
  v_correct := (p_selected_option = v_question.correct_option);

  begin
    insert into live_round_answers (round_id, team_id, question_id, selected_option, correct, response_time_ms)
    values (p_round_id, v_team.id, p_question_id, p_selected_option, v_correct, p_response_time_ms);
  exception when unique_violation then
    raise exception 'already answered';
  end;

  v_awarded := public.surge_answer_points(
    v_correct, v_surge.points_per_question, v_surge.negative_points_per_wrong_answer,
    p_response_time_ms, v_question.time_limit_seconds
  );

  if v_awarded <> 0 then
    insert into joule_transactions (student_id, surge_id, question_id, amount, type, response_time_ms)
    values (auth.uid(), v_round.surge_id, p_question_id, v_awarded, 'surge_earned', p_response_time_ms);
  end if;

  return query select v_correct, v_question.correct_option, v_awarded;
end;
$$;

-- ---------- complete_surge: the finalization pass ----------
-- Runs once, when an admin closes an async Surge. Every student who
-- answered at least one question is attached to their quiz group's roster
-- (or counted solo if they joined no group) computed from
-- quiz_group_members, not just from who happened to answer — a group's
-- pool is split across every REGISTERED member, since a group's roster is
-- locked before play starts (decision 49) and a member who registered but
-- never answered still counts toward the divisor, exactly as a real
-- classroom group-quiz would treat it.
create or replace function public.complete_surge(p_surge_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_surge surges;
begin
  -- Row lock: serializes any concurrent complete_surge() calls for the same
  -- Surge so the second caller blocks until the first commits, then sees
  -- status = 'complete' already and is rejected below — closing the
  -- double-credit race a plain status check alone wouldn't fully prevent.
  select * into v_surge from surges where id = p_surge_id for update;
  if v_surge.id is null then
    raise exception 'surge not found';
  end if;
  if not public.can_manage_surge(p_surge_id) then
    raise exception 'not authorized';
  end if;
  if v_surge.status = 'complete' then
    raise exception 'surge is already complete';
  end if;

  update surges set status = 'complete' where id = p_surge_id;

  with per_student_raw as (
    select
      sa.student_id,
      count(*)::integer as questions_answered,
      sum(public.surge_answer_points(
        sa.correct, v_surge.points_per_question, v_surge.negative_points_per_wrong_answer,
        sa.response_time_ms, q.time_limit_seconds
      ))::integer as raw_earned,
      avg(sa.response_time_ms) as avg_response_time_ms
    from surge_answers sa
    join questions q on q.id = sa.question_id
    where q.surge_id = p_surge_id
    group by sa.student_id
  ),
  roster as (
    -- Real group members (their group's full registered roster) ...
    select qgm.student_id, qgm.group_id as pool_key
    from quiz_group_members qgm
    where qgm.surge_id = p_surge_id
    union all
    -- ... plus solo participants: anyone who answered but joined no group.
    select psr.student_id, psr.student_id as pool_key
    from per_student_raw psr
    where not exists (
      select 1 from quiz_group_members qgm2
      where qgm2.surge_id = p_surge_id and qgm2.student_id = psr.student_id
    )
  ),
  roster_with_stats as (
    select
      r.student_id,
      r.pool_key,
      coalesce(psr.questions_answered, 0) as questions_answered,
      coalesce(psr.raw_earned, 0) as raw_earned,
      psr.avg_response_time_ms
    from roster r
    left join per_student_raw psr on psr.student_id = r.student_id
  ),
  group_totals as (
    select
      pool_key,
      count(*)::integer as member_count,
      (sum(questions_answered) * v_surge.participation_points_per_question)::integer as total_participation,
      sum(raw_earned)::integer as total_earned
    from roster_with_stats
    group by pool_key
  ),
  group_split as (
    select
      pool_key,
      floor(total_participation::numeric / member_count)::integer as participation_base,
      (total_participation - floor(total_participation::numeric / member_count)::integer * member_count)::integer as participation_remainder,
      floor(total_earned::numeric / member_count)::integer as earned_base,
      (total_earned - floor(total_earned::numeric / member_count)::integer * member_count)::integer as earned_remainder
    from group_totals
  ),
  ranked as (
    select
      rws.student_id,
      rws.pool_key,
      row_number() over (partition by rws.pool_key order by rws.avg_response_time_ms asc nulls last) as speed_rank
    from roster_with_stats rws
  ),
  awards as (
    select
      r.student_id,
      gs.participation_base + case when r.speed_rank <= gs.participation_remainder then 1 else 0 end as participation_award,
      gs.earned_base + case when r.speed_rank <= gs.earned_remainder then 1 else 0 end as earned_award
    from ranked r
    join group_split gs on gs.pool_key = r.pool_key
  )
  insert into joule_transactions (student_id, surge_id, amount, type)
  select student_id, p_surge_id, participation_award, 'surge_participation' from awards where participation_award <> 0
  union all
  select student_id, p_surge_id, earned_award, 'surge_earned' from awards where earned_award <> 0;
end;
$$;
revoke all on function public.complete_surge(uuid) from public;
grant execute on function public.complete_surge(uuid) to authenticated;

-- ---------- surge_leaderboard: include both pooled transaction types ----------

create or replace function public.surge_leaderboard(p_surge_id uuid)
returns table (
  student_id uuid, name text, total_amount integer,
  avg_response_time_ms numeric, earliest_completed_at timestamptz, rank bigint
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from surges where id = p_surge_id;
  if v_status is null then
    raise exception 'surge not found';
  end if;
  if v_status <> 'complete' and not public.is_committee_member_or_professor() then
    raise exception 'surge has not closed yet';
  end if;

  return query
    select
      s.student_id, st.name,
      sum(s.amount)::integer as total_amount,
      avg(s.response_time_ms) as avg_response_time_ms,
      max(sa.created_at) as earliest_completed_at,
      rank() over (
        order by sum(s.amount) desc, avg(s.response_time_ms) asc nulls last, max(sa.created_at) asc
      )
    from joule_transactions s
    join students st on st.id = s.student_id
    left join surge_answers sa on sa.student_id = s.student_id
      and sa.question_id in (select id from questions where surge_id = p_surge_id)
    where s.surge_id = p_surge_id and s.type in ('surge_earned', 'surge_participation')
    group by s.student_id, st.name
    order by total_amount desc;
end;
$$;

-- migrate:down

create or replace function public.surge_leaderboard(p_surge_id uuid)
returns table (
  student_id uuid, name text, total_amount integer,
  avg_response_time_ms numeric, earliest_completed_at timestamptz, rank bigint
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from surges where id = p_surge_id;
  if v_status is null then
    raise exception 'surge not found';
  end if;
  if v_status <> 'complete' and not public.is_committee_member_or_professor() then
    raise exception 'surge has not closed yet';
  end if;

  return query
    select
      s.student_id, st.name,
      sum(s.amount)::integer as total_amount,
      avg(s.response_time_ms) as avg_response_time_ms,
      max(sa.created_at) as earliest_completed_at,
      rank() over (
        order by sum(s.amount) desc, avg(s.response_time_ms) asc nulls last, max(sa.created_at) asc
      )
    from joule_transactions s
    join students st on st.id = s.student_id
    left join surge_answers sa on sa.student_id = s.student_id
      and sa.question_id in (select id from questions where surge_id = p_surge_id)
    where s.surge_id = p_surge_id and s.type = 'surge_earned'
    group by s.student_id, st.name
    order by total_amount desc;
end;
$$;

drop function if exists public.complete_surge(uuid);

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
    values (auth.uid(), v_round.surge_id, p_question_id, v_points, 'surge_earned', p_response_time_ms);
  end if;

  return query select v_correct, v_question.correct_option, case when v_correct then v_points else 0 end;
end;
$$;

create or replace function public.submit_surge_answer(
  p_question_id uuid,
  p_selected_option text,
  p_response_time_ms integer default null
)
returns table (correct boolean, correct_option text, awarded integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_question questions;
  v_surge_status text;
  v_correct boolean;
begin
  if not exists (select 1 from students where id = auth.uid()) then
    raise exception 'not a student';
  end if;
  if p_selected_option not in ('A', 'B', 'C', 'D') then
    raise exception 'invalid option';
  end if;

  select * into v_question from questions where id = p_question_id;
  if v_question.id is null then
    raise exception 'question not found';
  end if;
  select status into v_surge_status from surges where id = v_question.surge_id;
  if v_surge_status <> 'live' then
    raise exception 'surge is not live';
  end if;

  v_correct := (p_selected_option = v_question.correct_option);

  begin
    insert into surge_answers (student_id, question_id, selected_option, correct, response_time_ms)
    values (auth.uid(), p_question_id, p_selected_option, v_correct, p_response_time_ms);
  exception when unique_violation then
    raise exception 'already answered';
  end;

  if v_correct then
    insert into joule_transactions (student_id, surge_id, question_id, amount, type, response_time_ms)
    values (auth.uid(), v_question.surge_id, p_question_id,
            (select points_per_question from surges where id = v_question.surge_id),
            'surge_earned', p_response_time_ms);
  end if;

  return query select v_correct, v_question.correct_option,
    case when v_correct then (select points_per_question from surges where id = v_question.surge_id) else 0 end;
end;
$$;

drop function if exists public.surge_answer_points(boolean, integer, integer, integer, integer);
drop function if exists public.leave_quiz_group(uuid);
drop function if exists public.join_quiz_group(uuid);
drop function if exists public.create_quiz_group(uuid, text);

drop index if exists uq_one_surge_participation_pool_per_student;
drop index if exists uq_one_surge_earned_pool_per_student;
drop index if exists uq_one_earned_credit_per_student_question;
create unique index if not exists uq_one_answer_per_student_question
  on joule_transactions (student_id, question_id) where type = 'surge_correct_answer';

alter table joule_transactions drop constraint if exists joule_transactions_type_check;
update joule_transactions set type = 'surge_correct_answer' where type in ('surge_earned', 'surge_participation');
alter table joule_transactions add constraint joule_transactions_type_check
  check (type in ('event_scan', 'surge_correct_answer', 'admin_manual_adjustment'));

drop policy if exists "authenticated reads quiz group members" on quiz_group_members;
drop policy if exists "authenticated reads quiz groups" on quiz_groups;
drop table if exists quiz_group_members;
drop table if exists quiz_groups;

alter table surges drop column if exists negative_points_per_wrong_answer;
alter table surges drop column if exists participation_points_per_question;
