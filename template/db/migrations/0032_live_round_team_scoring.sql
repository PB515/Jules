-- 0032_live_round_team_scoring — grafts async Surge Mode's group
-- registration + pooled/split scoring mechanic (decision 49) onto Live
-- Round, since real-device testing plus direct user confirmation
-- established that Live Round, not async Surge Mode, is what will actually
-- be used. Mirrors the proven quiz_groups/quiz_group_members +
-- complete_surge() pattern rather than inventing new math — same
-- floor-division-plus-remainder-to-fastest split, same "authenticated
-- reads, RPC-only writes" RLS posture.
--
-- No real production Live Round data exists yet (dev/demo only, confirmed
-- before writing this) — a clean restructure, not a data migration.

-- migrate:up

-- ---------- live_round_teams: rename student_id -> created_by ----------
-- Was "one phone per team" (exactly one student, unique per round) — now
-- just "who created this team," matching quiz_groups.created_by. The
-- membership table below is the real roster.
alter table live_round_teams rename column student_id to created_by;
alter table live_round_teams drop constraint if exists live_round_teams_round_id_student_id_key;

-- ---------- live_round_team_members: the real per-team roster ----------
-- round_id is denormalized from the team's round (same reasoning as
-- quiz_group_members.surge_id, decision 49) so a real DB constraint, not
-- just an RPC check, guarantees a student can never be on two teams in the
-- same round.
create table if not exists live_round_team_members (
  team_id    uuid not null references live_round_teams(id) on delete cascade,
  round_id   uuid not null references live_rounds(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (team_id, student_id),
  unique (round_id, student_id)
);

alter table live_round_team_members enable row level security;
-- Team rosters aren't sensitive (same trust model as quiz_group_members and
-- live_round_teams themselves) — broad read lets the join screen list every
-- open team in a room. No direct write policies: the RPCs below are the
-- only writers.
create policy "authenticated reads live round team members" on live_round_team_members
  for select using (auth.uid() is not null);

-- Realtime only broadcasts changes for tables explicitly added to this
-- publication (same reminder as 0010's own comment) — needed for a live
-- "N joined your team" lobby UI.
alter publication supabase_realtime add table live_round_team_members;

-- ---------- live_round_answers: per-student answers, not per-team ----------
alter table live_round_answers add column if not exists student_id uuid references students(id);
update live_round_answers a set student_id = t.created_by
  from live_round_teams t where t.id = a.team_id and a.student_id is null;
alter table live_round_answers alter column student_id set not null;
alter table live_round_answers drop constraint if exists live_round_answers_team_id_question_id_key;
alter table live_round_answers add constraint live_round_answers_team_id_student_id_question_id_key
  unique (team_id, student_id, question_id);

-- The old per-team-creator read policy referenced live_round_teams.student_id
-- (now created_by) and only ever let the team's one original phone-holder
-- read answers — replaced with a real per-student check via student_id.
drop policy if exists "team reads own live answers" on live_round_answers;
create policy "student reads own live round answers" on live_round_answers
  for select using (student_id = auth.uid());

-- ---------- create_live_team / join_live_team / leave_live_team ----------
-- Mirror create_quiz_group/join_quiz_group/leave_quiz_group exactly, gated
-- on the round's phase = 'lobby' instead of a surge's status = 'draft'.

create or replace function public.create_live_team(p_room_code text, p_team_name text)
returns live_round_teams
language plpgsql security definer set search_path = public
as $$
declare
  v_round live_rounds;
  v_row live_round_teams;
begin
  if not exists (select 1 from students where id = auth.uid()) then
    raise exception 'not a student';
  end if;
  if char_length(trim(p_team_name)) = 0 then
    raise exception 'team name is required';
  end if;

  select * into v_round from live_rounds where room_code = upper(trim(p_room_code));
  if v_round.id is null then
    raise exception 'room not found';
  end if;
  if v_round.phase <> 'lobby' then
    raise exception 'this round has already started — teams can only be formed beforehand';
  end if;
  if exists (select 1 from live_round_team_members where round_id = v_round.id and student_id = auth.uid()) then
    raise exception 'you are already on a team for this round';
  end if;

  insert into live_round_teams (round_id, team_name, created_by)
  values (v_round.id, trim(p_team_name), auth.uid())
  returning * into v_row;

  insert into live_round_team_members (team_id, round_id, student_id)
  values (v_row.id, v_round.id, auth.uid());

  return v_row;
end;
$$;
revoke all on function public.create_live_team(text, text) from public;
grant execute on function public.create_live_team(text, text) to authenticated;

create or replace function public.join_live_team(p_team_id uuid)
returns live_round_team_members
language plpgsql security definer set search_path = public
as $$
declare
  v_team live_round_teams;
  v_round live_rounds;
  v_row live_round_team_members;
begin
  if not exists (select 1 from students where id = auth.uid()) then
    raise exception 'not a student';
  end if;
  select * into v_team from live_round_teams where id = p_team_id;
  if v_team.id is null then
    raise exception 'team not found';
  end if;
  select * into v_round from live_rounds where id = v_team.round_id;
  if v_round.phase <> 'lobby' then
    raise exception 'this round has already started — teams can only be joined beforehand';
  end if;
  if exists (select 1 from live_round_team_members where round_id = v_team.round_id and student_id = auth.uid()) then
    raise exception 'you are already on a team for this round';
  end if;

  insert into live_round_team_members (team_id, round_id, student_id)
  values (p_team_id, v_team.round_id, auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.join_live_team(uuid) from public;
grant execute on function public.join_live_team(uuid) to authenticated;

create or replace function public.leave_live_team(p_team_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_team live_round_teams;
  v_round live_rounds;
begin
  select * into v_team from live_round_teams where id = p_team_id;
  if v_team.id is null then
    raise exception 'team not found';
  end if;
  select * into v_round from live_rounds where id = v_team.round_id;
  if v_round.phase <> 'lobby' then
    raise exception 'this round has already started — you can no longer leave your team';
  end if;

  delete from live_round_team_members where team_id = p_team_id and student_id = auth.uid();

  if not exists (select 1 from live_round_team_members where team_id = p_team_id) then
    delete from live_round_teams where id = p_team_id;
  end if;
end;
$$;
revoke all on function public.leave_live_team(uuid) from public;
grant execute on function public.leave_live_team(uuid) to authenticated;

-- join_live_round is fully replaced by create_live_team/join_live_team above.
drop function if exists public.join_live_round(text, text);

-- ---------- submit_live_answer: per-student, deferred crediting ----------
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
  v_team_id uuid;
  v_question questions;
  v_surge surges;
  v_correct boolean;
  v_awarded integer;
begin
  select team_id into v_team_id from live_round_team_members
  where round_id = p_round_id and student_id = auth.uid();
  if v_team_id is null then
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
    insert into live_round_answers (round_id, team_id, student_id, question_id, selected_option, correct, response_time_ms)
    values (p_round_id, v_team_id, auth.uid(), p_question_id, p_selected_option, v_correct, p_response_time_ms);
  exception when unique_violation then
    raise exception 'already answered';
  end;

  -- Preview only — the real ledger write is deferred to complete_live_round(),
  -- mirroring async Surge Mode (decision 49), since pooled team splitting
  -- can't happen until every member's answers for the round are known.
  v_awarded := public.surge_answer_points(
    v_correct, v_surge.points_per_question, v_surge.negative_points_per_wrong_answer,
    p_response_time_ms, v_question.time_limit_seconds
  );

  return query select v_correct, v_question.correct_option, v_awarded;
end;
$$;

-- ---------- complete_live_round: pooled/split finalization ----------
-- Mirrors complete_surge()'s CTE almost verbatim (decision 49) — same
-- floor-division-plus-remainder-to-fastest-responder split, sourced from
-- live_round_answers/live_round_team_members instead of
-- surge_answers/quiz_group_members. Unlike complete_surge, every round
-- participant is necessarily on a team (no "solo, not in quiz_group_members"
-- union branch needed) since create_live_team always seeds a 1-person team.
create or replace function public.complete_live_round(p_round_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_round live_rounds;
  v_surge surges;
begin
  select * into v_round from live_rounds where id = p_round_id for update;
  if v_round.id is null then
    raise exception 'round not found';
  end if;
  if not public.can_manage_surge(v_round.surge_id) then
    raise exception 'not authorized';
  end if;

  select * into v_surge from surges where id = v_round.surge_id;

  with per_student_raw as (
    select
      a.student_id,
      count(*)::integer as questions_answered,
      sum(public.surge_answer_points(
        a.correct, v_surge.points_per_question, v_surge.negative_points_per_wrong_answer,
        a.response_time_ms, q.time_limit_seconds
      ))::integer as raw_earned,
      avg(a.response_time_ms) as avg_response_time_ms
    from live_round_answers a
    join questions q on q.id = a.question_id
    where a.round_id = p_round_id
    group by a.student_id
  ),
  roster as (
    select m.student_id, m.team_id as pool_key
    from live_round_team_members m
    where m.round_id = p_round_id
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
  select student_id, v_round.surge_id, participation_award, 'surge_participation' from awards where participation_award <> 0
  union all
  select student_id, v_round.surge_id, earned_award, 'surge_earned' from awards where earned_award <> 0;
end;
$$;
revoke all on function public.complete_live_round(uuid) from public;
grant execute on function public.complete_live_round(uuid) to authenticated;

-- host_advance_round now calls complete_live_round() in the same terminal
-- transition — the host doesn't need a separate "finalize" step, matching
-- the UX this project has always used for phase advancement.
create or replace function public.host_advance_round(p_round_id uuid)
returns live_rounds
language plpgsql security definer set search_path = public
as $$
declare
  v_round live_rounds;
  v_question_count integer;
  v_row live_rounds;
begin
  select * into v_round from live_rounds where id = p_round_id;
  if v_round.id is null then
    raise exception 'round not found';
  end if;
  if not public.can_manage_surge(v_round.surge_id) then
    raise exception 'not authorized';
  end if;

  select count(*) into v_question_count from questions where surge_id = v_round.surge_id;

  if v_round.phase = 'lobby' then
    update live_rounds set phase = 'question', question_index = 0, question_started_at = now()
    where id = p_round_id returning * into v_row;
  elsif v_round.phase = 'question' then
    update live_rounds set phase = 'reveal'
    where id = p_round_id returning * into v_row;
  elsif v_round.phase = 'reveal' then
    update live_rounds set phase = 'leaderboard'
    where id = p_round_id returning * into v_row;
  elsif v_round.phase = 'leaderboard' then
    if v_round.question_index + 1 < v_question_count then
      update live_rounds
      set phase = 'question', question_index = question_index + 1, question_started_at = now()
      where id = p_round_id returning * into v_row;
    else
      update live_rounds set phase = 'complete' where id = p_round_id returning * into v_row;
      perform public.complete_live_round(p_round_id);
    end if;
  else
    raise exception 'round has already ended';
  end if;

  return v_row;
end;
$$;

-- ---------- live_round_scoreboard: per-team, real formula amounts ----------
-- Fixes a pre-existing drift too: since 0023, submit_live_answer credited
-- the real time-weighted/negative-marking formula, but this function kept
-- independently recomputing a flat count(correct) * points_per_question —
-- now both use the same public.surge_answer_points() call.
create or replace function public.live_round_scoreboard(p_round_id uuid)
returns table (team_id uuid, team_name text, total_amount integer, rank bigint)
language sql stable security definer set search_path = public
as $$
  select
    t.id,
    t.team_name,
    coalesce(sum(public.surge_answer_points(
      a.correct, s.points_per_question, s.negative_points_per_wrong_answer,
      a.response_time_ms, q.time_limit_seconds
    )), 0)::integer as total_amount,
    rank() over (
      order by coalesce(sum(public.surge_answer_points(
        a.correct, s.points_per_question, s.negative_points_per_wrong_answer,
        a.response_time_ms, q.time_limit_seconds
      )), 0) desc, min(t.joined_at) asc
    )
  from live_round_teams t
  join live_rounds r on r.id = t.round_id
  join surges s on s.id = r.surge_id
  left join live_round_answers a on a.team_id = t.id
  left join questions q on q.id = a.question_id
  where t.round_id = p_round_id
  group by t.id, t.team_name
  order by total_amount desc;
$$;

-- ---------- live_round_question: membership check via the new roster ----------
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
    select 1 from live_round_team_members where round_id = p_round_id and student_id = auth.uid()
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

drop function if exists public.live_round_question(uuid);
drop function if exists public.live_round_scoreboard(uuid);
drop function if exists public.host_advance_round(uuid);
drop function if exists public.complete_live_round(uuid);
drop function if exists public.submit_live_answer(uuid, uuid, text, integer);
drop function if exists public.leave_live_team(uuid);
drop function if exists public.join_live_team(uuid);
drop function if exists public.create_live_team(text, text);

drop policy if exists "student reads own live round answers" on live_round_answers;
alter table live_round_answers drop constraint if exists live_round_answers_team_id_student_id_question_id_key;
alter table live_round_answers drop column if exists student_id;
alter table live_round_answers add constraint live_round_answers_team_id_question_id_key unique (team_id, question_id);

alter publication supabase_realtime drop table live_round_team_members;
drop table if exists live_round_team_members;

alter table live_round_teams drop constraint if exists live_round_teams_round_id_created_by_key;
alter table live_round_teams rename column created_by to student_id;
alter table live_round_teams add constraint live_round_teams_round_id_student_id_key unique (round_id, student_id);

create policy "team reads own live answers" on live_round_answers
  for select using (
    exists (select 1 from live_round_teams t where t.id = live_round_answers.team_id and t.student_id = auth.uid())
  );

create or replace function public.join_live_round(p_room_code text, p_team_name text)
returns live_round_teams
language plpgsql security definer set search_path = public
as $$
declare
  v_round live_rounds;
  v_row live_round_teams;
begin
  if not exists (select 1 from students where id = auth.uid()) then
    raise exception 'not a student';
  end if;
  if char_length(trim(p_team_name)) = 0 then
    raise exception 'team name is required';
  end if;

  select * into v_round from live_rounds where room_code = upper(trim(p_room_code));
  if v_round.id is null then
    raise exception 'room not found';
  end if;
  if v_round.phase = 'complete' then
    raise exception 'this round has already ended';
  end if;

  insert into live_round_teams (round_id, student_id, team_name)
  values (v_round.id, auth.uid(), trim(p_team_name))
  on conflict (round_id, student_id) do update set team_name = excluded.team_name
  returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.join_live_round(text, text) from public;
grant execute on function public.join_live_round(text, text) to authenticated;

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

create or replace function public.host_advance_round(p_round_id uuid)
returns live_rounds
language plpgsql security definer set search_path = public
as $$
declare
  v_round live_rounds;
  v_question_count integer;
  v_row live_rounds;
begin
  select * into v_round from live_rounds where id = p_round_id;
  if v_round.id is null then
    raise exception 'round not found';
  end if;
  if not public.can_manage_surge(v_round.surge_id) then
    raise exception 'not authorized';
  end if;

  select count(*) into v_question_count from questions where surge_id = v_round.surge_id;

  if v_round.phase = 'lobby' then
    update live_rounds set phase = 'question', question_index = 0, question_started_at = now()
    where id = p_round_id returning * into v_row;
  elsif v_round.phase = 'question' then
    update live_rounds set phase = 'reveal'
    where id = p_round_id returning * into v_row;
  elsif v_round.phase = 'reveal' then
    update live_rounds set phase = 'leaderboard'
    where id = p_round_id returning * into v_row;
  elsif v_round.phase = 'leaderboard' then
    if v_round.question_index + 1 < v_question_count then
      update live_rounds
      set phase = 'question', question_index = question_index + 1, question_started_at = now()
      where id = p_round_id returning * into v_row;
    else
      update live_rounds set phase = 'complete' where id = p_round_id returning * into v_row;
    end if;
  else
    raise exception 'round has already ended';
  end if;

  return v_row;
end;
$$;

create or replace function public.live_round_scoreboard(p_round_id uuid)
returns table (team_id uuid, team_name text, total_amount integer, rank bigint)
language sql stable security definer set search_path = public
as $$
  select
    t.id, t.team_name,
    coalesce(sum(a.correct::int) * (select points_per_question from surges s
      join live_rounds r on r.surge_id = s.id where r.id = p_round_id), 0)::integer as total_amount,
    rank() over (order by coalesce(sum(a.correct::int), 0) desc, t.joined_at asc)
  from live_round_teams t
  left join live_round_answers a on a.team_id = t.id
  where t.round_id = p_round_id
  group by t.id, t.team_name, t.joined_at
  order by total_amount desc;
$$;
revoke all on function public.live_round_scoreboard(uuid) from public;
grant execute on function public.live_round_scoreboard(uuid) to authenticated;

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
revoke all on function public.live_round_question(uuid) from public;
grant execute on function public.live_round_question(uuid) to authenticated;
