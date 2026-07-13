-- 0021_pivot_phase2_registration_streak — Pivot Phase 2 (CLAUDE.md decision
-- 45/47): event registration + an attendance-based streak, replacing the old
-- daily-app-activity streak entirely.
--
-- Shape, confirmed with the user during planning: a student registers for an
-- event ahead of time; attendance and points are credited together at the
-- SAME QR scan students already do at the end of the event (redeem_event_scan,
-- unchanged mechanism) — a matching registration just gets its attended_at
-- stamped alongside the existing Joule credit. Walk-in scans with no prior
-- registration still credit Joules exactly as before (doesn't break the
-- existing check-in flow); they just don't touch the streak.
--
-- Streak redefinition: "how reliably has this student shown up for what they
-- registered for," not "did they open the app today." Computed on read from
-- event_registrations (same "computed, never stored" philosophy as tiers/
-- season_joules/lifetime_joules, decision 11) — walk backward through a
-- student's CONCLUDED registrations ordered by event end time, counting
-- consecutive attended ones until the first no-show. A no-show doesn't just
-- freeze the count, it resets it to 0 immediately (the next successful
-- attendance starts counting from 1 again), which a stored running counter
-- would get subtly wrong in edge cases (e.g. two events concluding out of
-- registration order); a query recomputed fresh every time cannot drift.
--
-- The old `_bump_streak()` (daily login/activity, decision 13) is dropped
-- entirely, along with its call sites in submit_surge_answer/submit_live_answer
-- (quizzes no longer move the streak — only registered-event attendance does)
-- and the now-dead `students.streak_days`/`last_active_date` columns.

-- migrate:up

-- ---------- event_registrations ----------

create table if not exists event_registrations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id),
  student_id    uuid not null references students(id) on delete cascade,
  registered_at timestamptz not null default now(),
  attended_at   timestamptz,
  unique (event_id, student_id)
);
create index if not exists idx_event_registrations_student on event_registrations (student_id);
create index if not exists idx_event_registrations_event on event_registrations (event_id);

alter table event_registrations enable row level security;

create policy "student reads own registrations" on event_registrations
  for select using (student_id = auth.uid());
create policy "committee member or professor reads all registrations" on event_registrations
  for select using (public.is_committee_member_or_professor());
-- No insert/update/delete policies: register_for_event()/unregister_from_event()
-- (below) are the only writers, and redeem_event_scan() is the only thing
-- that ever stamps attended_at — same deny-by-default, RPC-only posture as
-- every other sensitive table in this project.

-- ---------- registration RPCs ----------

create or replace function public.register_for_event(p_event_id uuid)
returns event_registrations
language plpgsql security definer set search_path = public
as $$
declare
  v_event events;
  v_row event_registrations;
begin
  if not exists (select 1 from students where id = auth.uid()) then
    raise exception 'not a student';
  end if;

  select * into v_event from events where id = p_event_id;
  if v_event.id is null then
    raise exception 'event not found';
  end if;
  if v_event.type = 'surge' then
    raise exception 'surges are not registered for this way';
  end if;
  if now() > coalesce(v_event.end_date, v_event.event_date) then
    raise exception 'this event has already ended';
  end if;

  begin
    insert into event_registrations (event_id, student_id)
    values (p_event_id, auth.uid())
    returning * into v_row;
  exception when unique_violation then
    raise exception 'already registered for this event';
  end;

  return v_row;
end;
$$;
revoke all on function public.register_for_event(uuid) from public;
grant execute on function public.register_for_event(uuid) to authenticated;

-- A student may cancel any time before they've actually attended — once
-- attended_at is stamped, the registration is a real attendance record and
-- is no longer theirs to delete (same "ledger, not a mutable balance"
-- discipline as joule_transactions, decision 5).
create or replace function public.unregister_from_event(p_event_id uuid)
returns void
language sql security definer set search_path = public
as $$
  delete from event_registrations
  where event_id = p_event_id and student_id = auth.uid() and attended_at is null;
$$;
revoke all on function public.unregister_from_event(uuid) from public;
grant execute on function public.unregister_from_event(uuid) to authenticated;

-- ---------- computed attendance streak ----------

-- Internal helper only (same posture as student_season_joules/
-- student_lifetime_joules, decision 15's fix) — walks a student's already-
-- CONCLUDED registrations (event end time in the past) from most recent
-- backward, counting consecutive attended ones until the first no-show.
create or replace function public.student_attendance_streak(p_student_id uuid)
returns integer
language sql stable
as $$
  with concluded as (
    select
      er.attended_at is not null as attended,
      coalesce(e.end_date, e.event_date) as concluded_at
    from event_registrations er
    join events e on e.id = er.event_id
    where er.student_id = p_student_id
      and coalesce(e.end_date, e.event_date) < now()
  ),
  ranked as (
    select attended, row_number() over (order by concluded_at desc) as rn
    from concluded
  ),
  first_miss as (
    select min(rn) as rn from ranked where attended = false
  )
  select count(*)::integer
  from ranked
  where attended = true
    and rn < coalesce((select rn from first_miss), 2147483647);
$$;
revoke all on function public.student_attendance_streak(uuid) from public;

-- ---------- redeem_event_scan: stamp attendance, no more daily-streak bump ----------

create or replace function public.redeem_event_scan(
  p_event_id uuid,
  p_token text,
  p_lat double precision default null,
  p_lng double precision default null
)
returns table (amount integer, season_joules integer, tier text, flagged_geofence boolean)
language plpgsql security definer set search_path = public
as $$
declare
  v_event events;
  v_epoch bigint := public.qr_epoch();
  v_flagged boolean := false;
  v_distance_m double precision;
begin
  if not exists (select 1 from students where id = auth.uid()) then
    raise exception 'not a student';
  end if;

  select * into v_event from events where id = p_event_id;
  if v_event.id is null then
    raise exception 'event not found';
  end if;
  if v_event.type = 'surge' then
    raise exception 'surges are not checked in via QR';
  end if;

  if now() not between (v_event.event_date - interval '15 minutes')
                    and (coalesce(v_event.end_date, v_event.event_date) + interval '15 minutes') then
    raise exception 'scan window is closed for this event';
  end if;

  if upper(p_token) not in (
    public.qr_token_for_epoch(p_event_id, v_epoch),
    public.qr_token_for_epoch(p_event_id, v_epoch - 1)
  ) then
    raise exception 'invalid or expired code';
  end if;

  if v_event.geofence_lat is not null and v_event.geofence_lng is not null
     and p_lat is not null and p_lng is not null then
    -- haversine distance in meters
    v_distance_m := 6371000 * acos(
      least(1.0, greatest(-1.0,
        cos(radians(v_event.geofence_lat)) * cos(radians(p_lat)) *
        cos(radians(p_lng) - radians(v_event.geofence_lng)) +
        sin(radians(v_event.geofence_lat)) * sin(radians(p_lat))
      ))
    );
    if v_distance_m > v_event.geofence_radius_m then
      v_flagged := true; -- soft flag for admin review only, never a hard block (spec §9)
    end if;
  end if;

  begin
    insert into joule_transactions (student_id, event_id, amount, type, flagged_geofence)
    values (auth.uid(), p_event_id, v_event.joule_value, 'event_scan', v_flagged);
  exception when unique_violation then
    raise exception 'already credited for this event';
  end;

  -- Pivot Phase 2: credit attendance on a matching registration, if one
  -- exists. A walk-in scan (no prior registration) still credits Joules
  -- above unaffected — it just never touches the streak.
  update event_registrations
  set attended_at = now()
  where event_id = p_event_id and student_id = auth.uid() and attended_at is null;

  return query
    select v_event.joule_value,
           public.student_season_joules(auth.uid()),
           public.tier_for_joules(public.student_season_joules(auth.uid())),
           v_flagged;
end;
$$;
revoke all on function public.redeem_event_scan(uuid, text, double precision, double precision) from public;
grant execute on function public.redeem_event_scan(uuid, text, double precision, double precision) to authenticated;

-- ---------- quiz answers: no longer touch the streak ----------

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
            'surge_correct_answer', p_response_time_ms);
  end if;

  return query select v_correct, v_question.correct_option,
    case when v_correct then (select points_per_question from surges where id = v_question.surge_id) else 0 end;
end;
$$;

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
    values (auth.uid(), v_round.surge_id, p_question_id, v_points, 'surge_correct_answer', p_response_time_ms);
  end if;

  return query select v_correct, v_question.correct_option, case when v_correct then v_points else 0 end;
end;
$$;

drop function if exists public._bump_streak(uuid);

-- ---------- my_totals / admin_student_totals: computed streak, renamed field ----------
-- `streak_days` is renamed to `streak` everywhere it's returned — it no
-- longer counts calendar days, it counts consecutive attended registrations,
-- and keeping the old name would misrepresent what the number means now.
-- Postgres refuses to change a function's return-table column names via
-- CREATE OR REPLACE ("cannot change return type of existing function"),
-- same class of restriction as decision 46's parameter-rename fix — an
-- explicit DROP is required first.
drop function if exists public.my_totals();
drop function if exists public.admin_student_totals();

create or replace function public.my_totals()
returns table (
  season_joules integer,
  lifetime_joules integer,
  tier text,
  streak integer,
  status text
)
language sql stable security definer set search_path = public
as $$
  select
    public.student_season_joules(s.id),
    public.student_lifetime_joules(s.id),
    public.tier_for_joules(public.student_season_joules(s.id)),
    public.student_attendance_streak(s.id),
    s.status
  from students s
  where s.id = auth.uid();
$$;

create or replace function public.admin_student_totals()
returns table (
  id uuid, name text, college_email text, phone text, status text,
  streak integer, season_joules integer, lifetime_joules integer, tier text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_professor() then
    raise exception 'not authorized';
  end if;
  return query
    select
      s.id, s.name, s.college_email, s.phone, s.status,
      public.student_attendance_streak(s.id),
      public.student_season_joules(s.id),
      public.student_lifetime_joules(s.id),
      public.tier_for_joules(public.student_season_joules(s.id))
    from students s
    order by s.name;
end;
$$;

-- ---------- drop the now-dead daily-streak columns ----------
-- The self-update-restriction trigger (0005/0013/0020) checked these two
-- columns specifically; redefine it first so it doesn't reference a column
-- that's about to be dropped.

create or replace function public.trg_students_restrict_self_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_professor() or current_setting('jules.trusted_write', true) = 'on' then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.college_email is distinct from old.college_email then
    raise exception 'only name and phone are self-editable';
  end if;
  return new;
end;
$$;

alter table students drop column if exists streak_days;
alter table students drop column if exists last_active_date;

-- migrate:down

alter table students add column if not exists streak_days integer not null default 0;
alter table students add column if not exists last_active_date date;

create or replace function public.trg_students_restrict_self_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_professor() or current_setting('jules.trusted_write', true) = 'on' then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.streak_days is distinct from old.streak_days
     or new.last_active_date is distinct from old.last_active_date
     or new.college_email is distinct from old.college_email then
    raise exception 'only name and phone are self-editable';
  end if;
  return new;
end;
$$;

drop function if exists public.admin_student_totals();
drop function if exists public.my_totals();

create or replace function public.admin_student_totals()
returns table (
  id uuid, name text, college_email text, phone text, status text,
  streak_days integer, season_joules integer, lifetime_joules integer, tier text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_professor() then
    raise exception 'not authorized';
  end if;
  return query
    select
      s.id, s.name, s.college_email, s.phone, s.status, s.streak_days,
      public.student_season_joules(s.id),
      public.student_lifetime_joules(s.id),
      public.tier_for_joules(public.student_season_joules(s.id))
    from students s
    order by s.name;
end;
$$;

create or replace function public.my_totals()
returns table (
  season_joules integer,
  lifetime_joules integer,
  tier text,
  streak_days integer,
  status text
)
language sql stable security definer set search_path = public
as $$
  select
    public.student_season_joules(s.id),
    public.student_lifetime_joules(s.id),
    public.tier_for_joules(public.student_season_joules(s.id)),
    s.streak_days,
    s.status
  from students s
  where s.id = auth.uid();
$$;

create or replace function public._bump_streak(p_student_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform set_config('jules.trusted_write', 'on', true);
  update students
  set streak_days = case
        when last_active_date is null then 1
        when last_active_date = current_date then streak_days
        when last_active_date = current_date - 1 then streak_days + 1
        else 1
      end,
      last_active_date = current_date
  where id = p_student_id;
end;
$$;

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
    values (auth.uid(), v_round.surge_id, p_question_id, v_points, 'surge_correct_answer', p_response_time_ms);
    perform public._bump_streak(auth.uid());
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
            'surge_correct_answer', p_response_time_ms);
    perform public._bump_streak(auth.uid());
  end if;

  return query select v_correct, v_question.correct_option,
    case when v_correct then (select points_per_question from surges where id = v_question.surge_id) else 0 end;
end;
$$;

create or replace function public.redeem_event_scan(
  p_event_id uuid,
  p_token text,
  p_lat double precision default null,
  p_lng double precision default null
)
returns table (amount integer, season_joules integer, tier text, flagged_geofence boolean)
language plpgsql security definer set search_path = public
as $$
declare
  v_event events;
  v_epoch bigint := public.qr_epoch();
  v_flagged boolean := false;
  v_distance_m double precision;
begin
  if not exists (select 1 from students where id = auth.uid()) then
    raise exception 'not a student';
  end if;

  select * into v_event from events where id = p_event_id;
  if v_event.id is null then
    raise exception 'event not found';
  end if;
  if v_event.type = 'surge' then
    raise exception 'surges are not checked in via QR';
  end if;

  if now() not between (v_event.event_date - interval '15 minutes')
                    and (coalesce(v_event.end_date, v_event.event_date) + interval '15 minutes') then
    raise exception 'scan window is closed for this event';
  end if;

  if upper(p_token) not in (
    public.qr_token_for_epoch(p_event_id, v_epoch),
    public.qr_token_for_epoch(p_event_id, v_epoch - 1)
  ) then
    raise exception 'invalid or expired code';
  end if;

  if v_event.geofence_lat is not null and v_event.geofence_lng is not null
     and p_lat is not null and p_lng is not null then
    v_distance_m := 6371000 * acos(
      least(1.0, greatest(-1.0,
        cos(radians(v_event.geofence_lat)) * cos(radians(p_lat)) *
        cos(radians(p_lng) - radians(v_event.geofence_lng)) +
        sin(radians(v_event.geofence_lat)) * sin(radians(p_lat))
      ))
    );
    if v_distance_m > v_event.geofence_radius_m then
      v_flagged := true;
    end if;
  end if;

  begin
    insert into joule_transactions (student_id, event_id, amount, type, flagged_geofence)
    values (auth.uid(), p_event_id, v_event.joule_value, 'event_scan', v_flagged);
  exception when unique_violation then
    raise exception 'already credited for this event';
  end;

  perform public._bump_streak(auth.uid());

  return query
    select v_event.joule_value,
           public.student_season_joules(auth.uid()),
           public.tier_for_joules(public.student_season_joules(auth.uid())),
           v_flagged;
end;
$$;

drop function if exists public.student_attendance_streak(uuid);
drop function if exists public.unregister_from_event(uuid);
drop function if exists public.register_for_event(uuid);

drop policy if exists "committee member or professor reads all registrations" on event_registrations;
drop policy if exists "student reads own registrations" on event_registrations;
drop table if exists event_registrations;
