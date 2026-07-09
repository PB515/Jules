-- 0010_jules_live_rounds — "Live Round": a Kahoot-style, host-paced quiz mode
-- alongside the existing self-paced async Surge Mode (see CLAUDE.md decision
-- 24). Same questions/tier/Joule infrastructure; a different play pattern:
-- a host (officer/owner) advances one question at a time for the whole room,
-- teams (one phone per team, credited to whichever student holds it) answer
-- live, and a scoreboard updates after every question via Supabase Realtime.
--
-- Team play is deliberately NOT a new membership/roster model — one student
-- creates a team entry under their own login and picks a display name;
-- Joules from a correct answer land on that one student's ledger, same as
-- any other surge_correct_answer. This reuses the existing individual
-- Joule/tier system rather than inventing a parallel "team economy."

-- migrate:up

create table live_rounds (
  id                    uuid primary key default gen_random_uuid(),
  surge_id              uuid not null references surges(id),
  room_code             text not null unique,
  phase                 text not null default 'lobby'
                          check (phase in ('lobby', 'question', 'reveal', 'leaderboard', 'complete')),
  question_index        integer not null default 0,
  question_started_at   timestamptz,
  created_by            uuid not null references admins(id),
  created_at            timestamptz not null default now()
);
create index if not exists idx_live_rounds_room_code on live_rounds (room_code);

-- One team entry per student per round — "one phone per team" (no roster).
create table live_round_teams (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references live_rounds(id) on delete cascade,
  student_id  uuid not null references students(id),
  team_name   text not null check (char_length(team_name) between 1 and 40),
  joined_at   timestamptz not null default now(),
  unique (round_id, student_id)
);

-- One row per (team, question) — mirrors surge_answers' rate-limit shape.
create table live_round_answers (
  id                uuid primary key default gen_random_uuid(),
  round_id          uuid not null references live_rounds(id) on delete cascade,
  team_id           uuid not null references live_round_teams(id) on delete cascade,
  question_id       uuid not null references questions(id),
  selected_option   text not null check (selected_option in ('A', 'B', 'C', 'D')),
  correct           boolean not null,
  response_time_ms  integer,
  created_at        timestamptz not null default now(),
  unique (team_id, question_id)
);

alter table live_rounds enable row level security;
alter table live_round_teams enable row level security;
alter table live_round_answers enable row level security;

-- live_rounds: browsing by room code is the trust model (like a Kahoot PIN) —
-- content is a quiz already meant for the room to see on a shared screen, so
-- broad read is low-stakes. Only the hosting officer/owner may create/advance.
create policy "authenticated reads live rounds" on live_rounds
  for select using (auth.uid() is not null);
create policy "officer or owner manages live rounds" on live_rounds
  for all using (public.is_officer_or_owner()) with check (public.is_officer_or_owner());

-- live_round_teams: a student manages their own team row; anyone in the round
-- (or staff) can see WHO has joined (team names, not answers) for the lobby view.
create policy "authenticated reads live round teams" on live_round_teams
  for select using (auth.uid() is not null);
-- No insert/update policy for plain students: join_live_round() (below) is the
-- only writer, so team creation is validated (domain, round phase) in one place.

-- live_round_answers: NEVER broadly readable — a team's selected_option must
-- stay private until the host reveals, and even then only in aggregate (via
-- live_round_scoreboard() below, which never returns selected_option). Only
-- the answering team itself, or staff, may read raw rows.
create policy "team reads own live answers" on live_round_answers
  for select using (
    exists (
      select 1 from live_round_teams t
      where t.id = live_round_answers.team_id and t.student_id = auth.uid()
    )
  );
create policy "officer or owner reads all live answers" on live_round_answers
  for select using (public.is_officer_or_owner());
-- No write policies: submit_live_answer() (below) is the only writer.

-- ---------- RPCs ----------

create or replace function public.host_create_round(p_surge_id uuid)
returns live_rounds
language plpgsql security definer set search_path = public
as $$
declare
  v_code text;
  v_row live_rounds;
begin
  if not public.is_officer_or_owner() then
    raise exception 'not authorized';
  end if;
  if not exists (select 1 from surges where id = p_surge_id) then
    raise exception 'surge not found';
  end if;

  loop
    v_code := upper(substr(md5(random()::text), 1, 4));
    exit when not exists (select 1 from live_rounds where room_code = v_code and phase <> 'complete');
  end loop;

  insert into live_rounds (surge_id, room_code, created_by)
  values (p_surge_id, v_code, auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.host_create_round(uuid) from public;
grant execute on function public.host_create_round(uuid) to authenticated;

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

-- Advances the round one step: lobby->question, question->reveal,
-- reveal->leaderboard, leaderboard->question (next index) or ->complete if
-- that was the last question. No explicit target phase from the caller —
-- one button ("Next"), one deterministic sequence, nothing for a host to get
-- wrong mid-class.
create or replace function public.host_advance_round(p_round_id uuid)
returns live_rounds
language plpgsql security definer set search_path = public
as $$
declare
  v_round live_rounds;
  v_question_count integer;
  v_row live_rounds;
begin
  if not public.is_officer_or_owner() then
    raise exception 'not authorized';
  end if;
  select * into v_round from live_rounds where id = p_round_id;
  if v_round.id is null then
    raise exception 'round not found';
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
revoke all on function public.host_advance_round(uuid) from public;
grant execute on function public.host_advance_round(uuid) to authenticated;

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

  select * into v_question from questions where id = p_question_id and surge_id = v_round.surge_id;
  if v_question.id is null then
    raise exception 'question not found for this round';
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
revoke all on function public.submit_live_answer(uuid, uuid, text, integer) from public;
grant execute on function public.submit_live_answer(uuid, uuid, text, integer) to authenticated;

-- Live scoreboard: aggregate only (team_name + running total + rank), never
-- selected_option — this is the one path teams and the host use to see
-- cross-team standings, so live_round_answers itself can stay locked down.
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

-- Realtime only broadcasts changes for tables explicitly added to this
-- publication — without this, the host/team screens' postgres_changes
-- subscriptions would silently receive nothing. RLS still applies per
-- subscriber; this only controls which tables are eligible to broadcast.
alter publication supabase_realtime add table live_rounds;
alter publication supabase_realtime add table live_round_teams;
alter publication supabase_realtime add table live_round_answers;

-- migrate:down

alter publication supabase_realtime drop table live_round_answers;
alter publication supabase_realtime drop table live_round_teams;
alter publication supabase_realtime drop table live_rounds;

drop function if exists public.live_round_scoreboard(uuid);
drop function if exists public.submit_live_answer(uuid, uuid, text, integer);
drop function if exists public.host_advance_round(uuid);
drop function if exists public.join_live_round(text, text);
drop function if exists public.host_create_round(uuid);

drop policy if exists "officer or owner reads all live answers" on live_round_answers;
drop policy if exists "team reads own live answers" on live_round_answers;
drop policy if exists "authenticated reads live round teams" on live_round_teams;
drop policy if exists "officer or owner manages live rounds" on live_rounds;
drop policy if exists "authenticated reads live rounds" on live_rounds;

drop table if exists live_round_answers;
drop table if exists live_round_teams;
drop table if exists live_rounds;
