-- 0051: no-login "operator links" for Attendance and Live Round hosting.
--
-- Context: the user wants to hand a bare link to whoever's actually running
-- an event/quiz in the room, with no admin account required at all —
-- "we are assuming that person with link is trusted to start and organise
-- that event." Every hosting action today (start_event_attendance,
-- host_advance_round, etc.) is gated purely by can_manage_event()/
-- can_manage_surge(), which require a real auth.uid() matched against the
-- admins table. This migration adds a per-event/per-round random secret
-- (operator_token) and threads an optional p_token through the existing
-- RPCs as a second, alternative authorization path — never replacing the
-- existing admin-session check, only OR'd alongside it, so an already-
-- logged-in admin's session keeps working exactly as before.
--
-- Two things deliberately NOT done here, on purpose:
--   - live_round_scoreboard previously had NO internal authorization check
--     at all (only a `grant to authenticated`) — simply granting it to
--     `anon` too would have let anyone on the internet read any round's
--     scoreboard by guessing a round id. Fixed by requiring a valid token
--     specifically when auth.uid() is null, leaving today's "any logged-in
--     user can read any round" behavior (the deliberate "Kahoot PIN" trust
--     model, decision 24) completely unchanged for authenticated callers.
--   - get_round_for_operator phase-gates correct_option the same way the
--     student-facing live_round_question() already does (only questions at
--     or before the round's current revealed point), rather than handing a
--     bearer-token link the whole answer key up front the way the
--     authenticated host screen's own initial fetch incidentally does today.

-- migrate:up

-- ---------- schema: one durable secret per row ----------
alter table events add column if not exists operator_token text;
alter table live_rounds add column if not exists operator_token text;

alter table audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table audit_log_entries add constraint audit_log_entries_action_check
  check (action in (
    'force_reset', 'manual_joule_adjustment', 'csv_import', 'role_change',
    'event_create', 'event_edit', 'report_create', 'gallery_upload', 'live_round_create',
    'event_update_sent', 'attendance_start', 'operator_link_created', 'operator_link_reset'
  ));

-- ---------- token-validity helpers ----------
-- Deliberately NOT granted to anon/authenticated at all — only ever called
-- internally, from inside another SECURITY DEFINER function's own body
-- (same posture as qr_secret(), decision 31: kept fully private, reachable
-- only via the internal call chain).
create or replace function public.is_valid_event_operator(p_event_id uuid, p_token text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_token is not null and p_token <> '' and p_token = (
    select operator_token from events where id = p_event_id
  );
$$;
revoke all on function public.is_valid_event_operator(uuid, text) from public;

create or replace function public.is_valid_round_operator(p_round_id uuid, p_token text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_token is not null and p_token <> '' and p_token = (
    select operator_token from live_rounds where id = p_round_id
  );
$$;
revoke all on function public.is_valid_round_operator(uuid, text) from public;

-- ---------- minting/resetting a link: always admin-only ----------
create or replace function public.ensure_event_operator_token(p_event_id uuid)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_token text;
begin
  if not public.can_manage_event(p_event_id) then
    raise exception 'not authorized';
  end if;
  select operator_token into v_token from events where id = p_event_id;
  if v_token is null then
    v_token := encode(gen_random_bytes(20), 'hex');
    update events set operator_token = v_token where id = p_event_id;
    perform public.log_admin_action('operator_link_created', jsonb_build_object('kind', 'attendance', 'event_id', p_event_id));
  end if;
  return v_token;
end;
$$;
revoke all on function public.ensure_event_operator_token(uuid) from public;
grant execute on function public.ensure_event_operator_token(uuid) to authenticated;

create or replace function public.reset_event_operator_token(p_event_id uuid)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_token text;
begin
  if not public.can_manage_event(p_event_id) then
    raise exception 'not authorized';
  end if;
  v_token := encode(gen_random_bytes(20), 'hex');
  update events set operator_token = v_token where id = p_event_id;
  perform public.log_admin_action('operator_link_reset', jsonb_build_object('kind', 'attendance', 'event_id', p_event_id));
  return v_token;
end;
$$;
revoke all on function public.reset_event_operator_token(uuid) from public;
grant execute on function public.reset_event_operator_token(uuid) to authenticated;

create or replace function public.ensure_round_operator_token(p_round_id uuid)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_token text;
  v_surge_id uuid;
begin
  select surge_id into v_surge_id from live_rounds where id = p_round_id;
  if v_surge_id is null then
    raise exception 'round not found';
  end if;
  if not public.can_manage_surge(v_surge_id) then
    raise exception 'not authorized';
  end if;
  select operator_token into v_token from live_rounds where id = p_round_id;
  if v_token is null then
    v_token := encode(gen_random_bytes(20), 'hex');
    update live_rounds set operator_token = v_token where id = p_round_id;
    perform public.log_admin_action('operator_link_created', jsonb_build_object('kind', 'live_round', 'round_id', p_round_id));
  end if;
  return v_token;
end;
$$;
revoke all on function public.ensure_round_operator_token(uuid) from public;
grant execute on function public.ensure_round_operator_token(uuid) to authenticated;

create or replace function public.reset_round_operator_token(p_round_id uuid)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_token text;
  v_surge_id uuid;
begin
  select surge_id into v_surge_id from live_rounds where id = p_round_id;
  if v_surge_id is null then
    raise exception 'round not found';
  end if;
  if not public.can_manage_surge(v_surge_id) then
    raise exception 'not authorized';
  end if;
  v_token := encode(gen_random_bytes(20), 'hex');
  update live_rounds set operator_token = v_token where id = p_round_id;
  perform public.log_admin_action('operator_link_reset', jsonb_build_object('kind', 'live_round', 'round_id', p_round_id));
  return v_token;
end;
$$;
revoke all on function public.reset_round_operator_token(uuid) from public;
grant execute on function public.reset_round_operator_token(uuid) to authenticated;

-- ---------- attendance-side RPCs: add an OR'd token path ----------

drop function if exists public.start_event_attendance(uuid, integer);
create or replace function public.start_event_attendance(p_event_id uuid, p_duration_minutes integer default null, p_token text default null)
returns table (attendance_opens_at timestamptz, attendance_closes_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  v_event events;
  v_duration integer;
begin
  if not (public.can_manage_event(p_event_id) or public.is_valid_event_operator(p_event_id, p_token)) then
    raise exception 'not authorized';
  end if;
  select * into v_event from events where id = p_event_id;
  if v_event.id is null then
    raise exception 'event not found';
  end if;
  if v_event.type = 'surge' then
    raise exception 'surges are not checked in via QR';
  end if;

  v_duration := coalesce(p_duration_minutes, v_event.attendance_duration_minutes);
  if v_duration <= 0 then
    raise exception 'duration must be positive';
  end if;

  update events
  set attendance_opens_at = now(),
      attendance_closes_at = now() + (v_duration * interval '1 minute')
  where id = p_event_id
  returning events.attendance_opens_at, events.attendance_closes_at
  into attendance_opens_at, attendance_closes_at;

  -- admin_id is nullable; for an operator-link caller auth.uid() is null,
  -- which would otherwise silently write a bare null admin_id row —
  -- tagged with 'via': 'operator_link' so it reads as an intentional gap
  -- in /admin/audit, not a bug.
  insert into audit_log_entries (admin_id, action, details)
  values (
    auth.uid(), 'attendance_start',
    case when auth.uid() is null
      then jsonb_build_object('event_id', p_event_id, 'duration_minutes', v_duration, 'via', 'operator_link')
      else jsonb_build_object('event_id', p_event_id, 'duration_minutes', v_duration)
    end
  );

  return next;
end;
$$;
revoke all on function public.start_event_attendance(uuid, integer, text) from public;
grant execute on function public.start_event_attendance(uuid, integer, text) to authenticated, anon;

drop function if exists public.current_qr_token(uuid);
create or replace function public.current_qr_token(p_event_id uuid, p_token text default null)
returns table (token text, expires_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_epoch bigint := public.qr_epoch();
  v_event events;
begin
  if not (public.can_manage_event(p_event_id) or public.is_valid_event_operator(p_event_id, p_token)) then
    raise exception 'not authorized';
  end if;
  select * into v_event from events where id = p_event_id;
  if v_event.id is null
     or v_event.attendance_opens_at is null or v_event.attendance_closes_at is null
     or now() not between v_event.attendance_opens_at and v_event.attendance_closes_at then
    return;
  end if;
  return query select
    public.qr_token_for_epoch(p_event_id, v_epoch),
    to_timestamp((v_epoch + 1) * 90);
end;
$$;
revoke all on function public.current_qr_token(uuid, text) from public;
grant execute on function public.current_qr_token(uuid, text) to authenticated, anon;

drop function if exists public.event_scan_metrics(uuid);
create or replace function public.event_scan_metrics(p_event_id uuid, p_token text default null)
returns table (students_scanned integer, joules_distributed integer)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not (public.can_manage_event(p_event_id) or public.is_valid_event_operator(p_event_id, p_token)) then
    raise exception 'not authorized';
  end if;
  return query
    select count(*)::integer, coalesce(sum(amount), 0)::integer
    from joule_transactions
    where event_id = p_event_id and type = 'event_scan';
end;
$$;
revoke all on function public.event_scan_metrics(uuid, text) from public;
grant execute on function public.event_scan_metrics(uuid, text) to authenticated, anon;

drop function if exists public.event_recent_scans(uuid, integer);
create or replace function public.event_recent_scans(p_event_id uuid, p_limit integer default 10, p_token text default null)
returns table (student_name text, amount integer, flagged_geofence boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not (public.can_manage_event(p_event_id) or public.is_valid_event_operator(p_event_id, p_token)) then
    raise exception 'not authorized';
  end if;
  return query
    select s.name, jt.amount, jt.flagged_geofence, jt.created_at
    from joule_transactions jt
    join students s on s.id = jt.student_id
    where jt.event_id = p_event_id and jt.type = 'event_scan'
    order by jt.created_at desc
    limit p_limit;
end;
$$;
revoke all on function public.event_recent_scans(uuid, integer, text) from public;
grant execute on function public.event_recent_scans(uuid, integer, text) to authenticated, anon;

-- ---------- quiz-hosting RPCs: same OR'd token path ----------

-- complete_live_round is never called directly by any client — only from
-- inside host_advance_round's own terminal-phase transition via `perform`
-- — so it keeps its existing `grant ... to authenticated` untouched (the
-- internal call works regardless, since both functions share the same
-- definer/owner). Only its own authorization check needs the token OR,
-- otherwise an operator-link "Finish round" would roll back with
-- 'not authorized' the moment it reached this nested call.
drop function if exists public.complete_live_round(uuid);
create or replace function public.complete_live_round(p_round_id uuid, p_token text default null)
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
  if not (public.can_manage_surge(v_round.surge_id) or public.is_valid_round_operator(p_round_id, p_token)) then
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
      rank() over (order by total_earned desc) as placement,
      member_count
    from group_totals
  ),
  placement_pool as (
    select
      pool_key,
      participation_base,
      participation_remainder,
      member_count,
      case
        when placement = 1 then 30
        when placement = 2 then 25
        when placement = 3 then 20
        else 10
      end as earned_pool
    from group_split
  ),
  earned_split as (
    select
      pool_key,
      participation_base,
      participation_remainder,
      floor(earned_pool::numeric / member_count)::integer as earned_base,
      (earned_pool - floor(earned_pool::numeric / member_count)::integer * member_count)::integer as earned_remainder,
      member_count
    from placement_pool
  ),
  ranked_members as (
    select
      rs.student_id,
      rs.pool_key,
      es.participation_base,
      es.participation_remainder,
      es.earned_base,
      es.earned_remainder,
      row_number() over (
        partition by rs.pool_key
        order by rs.avg_response_time_ms asc nulls last, rs.student_id
      ) as speed_rank
    from roster_with_stats rs
    join earned_split es on es.pool_key = rs.pool_key
  )
  insert into joule_transactions (student_id, surge_id, amount, type)
  select
    student_id,
    (select surge_id from live_rounds where id = p_round_id),
    participation_base + (case when speed_rank <= participation_remainder then 1 else 0 end),
    'surge_participation'
  from ranked_members
  where participation_base + (case when speed_rank <= participation_remainder then 1 else 0 end) > 0
  union all
  select
    student_id,
    (select surge_id from live_rounds where id = p_round_id),
    earned_base + (case when speed_rank <= earned_remainder then 1 else 0 end),
    'surge_earned'
  from ranked_members
  where earned_base + (case when speed_rank <= earned_remainder then 1 else 0 end) <> 0;
end;
$$;
revoke all on function public.complete_live_round(uuid, text) from public;
grant execute on function public.complete_live_round(uuid, text) to authenticated;

drop function if exists public.host_advance_round(uuid);
create or replace function public.host_advance_round(p_round_id uuid, p_token text default null)
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
  if not (public.can_manage_surge(v_round.surge_id) or public.is_valid_round_operator(p_round_id, p_token)) then
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
      perform public.complete_live_round(p_round_id, p_token);
    end if;
  else
    raise exception 'round has already ended';
  end if;

  return v_row;
end;
$$;
revoke all on function public.host_advance_round(uuid, text) from public;
grant execute on function public.host_advance_round(uuid, text) to authenticated, anon;

-- live_round_scoreboard previously had NO internal check at all — only
-- `grant to authenticated` stood between "any real login" and "anyone".
-- Requiring a valid token specifically when auth.uid() is null closes the
-- anon-grant gap without touching the already-reviewed, deliberate
-- "any logged-in user" behavior for authenticated callers. Also folds in
-- team/member counts (previously fetched separately via raw
-- .from('live_round_teams') counts by host-client.tsx) so the anonymous
-- operator page never needs direct table reads under RLS-for-anon.
drop function if exists public.live_round_scoreboard(uuid);
create or replace function public.live_round_scoreboard(p_round_id uuid, p_token text default null)
returns table (team_id uuid, team_name text, total_amount integer, rank bigint, team_count integer, member_count integer)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_team_count integer;
  v_member_count integer;
begin
  if auth.uid() is null and not public.is_valid_round_operator(p_round_id, p_token) then
    raise exception 'not authorized';
  end if;

  select count(*) into v_team_count from live_round_teams where round_id = p_round_id;
  select count(*) into v_member_count from live_round_team_members where round_id = p_round_id;

  return query
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
      ),
      v_team_count,
      v_member_count
    from live_round_teams t
    join live_rounds r on r.id = t.round_id
    join surges s on s.id = r.surge_id
    left join live_round_answers a on a.team_id = t.id
    left join questions q on q.id = a.question_id
    where t.round_id = p_round_id
    group by t.id, t.team_name
    order by total_amount desc;
end;
$$;
revoke all on function public.live_round_scoreboard(uuid, text) from public;
grant execute on function public.live_round_scoreboard(uuid, text) to authenticated, anon;

-- ---------- new: the anonymous operator's initial data fetch ----------
-- Replaces the authenticated host page's raw `.from('questions').select(...)`
-- (which has no cookie session to run as, for an anonymous caller). Mirrors
-- live_round_question()'s own phase-gating for correct_option — a question
-- is only revealed once the round has actually moved past it, not the
-- whole answer key up front, so a leaked/screenshotted link before the
-- round starts exposes nothing.
create or replace function public.get_round_for_operator(p_round_id uuid, p_token text)
returns table (
  round_id uuid, room_code text, phase text, question_index integer, question_started_at timestamptz,
  surge_name text, points_per_question integer,
  question_id uuid, question_text text, option_a text, option_b text, option_c text, option_d text,
  correct_option text, time_limit_seconds integer, order_index integer
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_round live_rounds;
begin
  if not public.is_valid_round_operator(p_round_id, p_token) then
    raise exception 'not authorized';
  end if;
  select * into v_round from live_rounds where id = p_round_id;
  if v_round.id is null then
    raise exception 'round not found';
  end if;

  return query
    select
      v_round.id, v_round.room_code, v_round.phase, v_round.question_index, v_round.question_started_at,
      s.name, s.points_per_question,
      q.id, q.text, q.option_a, q.option_b, q.option_c, q.option_d,
      case
        when q.order_index < v_round.question_index
          or (q.order_index = v_round.question_index and v_round.phase in ('reveal', 'leaderboard', 'complete'))
        then q.correct_option
        else null
      end,
      q.time_limit_seconds, q.order_index
    from surges s
    join questions q on q.surge_id = s.id
    where s.id = v_round.surge_id
    order by q.order_index;
end;
$$;
revoke all on function public.get_round_for_operator(uuid, text) from public;
grant execute on function public.get_round_for_operator(uuid, text) to anon, authenticated;

-- Same idea, for the attendance operator page — its own basic display info
-- (name, points value, the current window state) isn't returned by any of
-- the token-gated attendance RPCs above, and a raw `.from('events').select`
-- would return zero rows for an anon caller (events' own RLS policy is
-- `auth.uid() is not null`), not an error, which would silently render a
-- blank event name instead of failing loudly.
create or replace function public.get_event_for_operator(p_event_id uuid, p_token text)
returns table (
  name text, joule_value integer,
  attendance_duration_minutes integer, attendance_opens_at timestamptz, attendance_closes_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_valid_event_operator(p_event_id, p_token) then
    raise exception 'not authorized';
  end if;
  return query
    select e.name, e.joule_value, e.attendance_duration_minutes, e.attendance_opens_at, e.attendance_closes_at
    from events e
    where e.id = p_event_id;
end;
$$;
revoke all on function public.get_event_for_operator(uuid, text) from public;
grant execute on function public.get_event_for_operator(uuid, text) to anon, authenticated;

-- migrate:down

drop function if exists public.get_event_for_operator(uuid, text);
drop function if exists public.get_round_for_operator(uuid, text);

drop function if exists public.live_round_scoreboard(uuid, text);
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
revoke all on function public.live_round_scoreboard(uuid) from public;
grant execute on function public.live_round_scoreboard(uuid) to authenticated;

drop function if exists public.host_advance_round(uuid, text);
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
revoke all on function public.host_advance_round(uuid) from public;
grant execute on function public.host_advance_round(uuid) to authenticated;

drop function if exists public.complete_live_round(uuid, text);
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
      rank() over (order by total_earned desc) as placement,
      member_count
    from group_totals
  ),
  placement_pool as (
    select
      pool_key,
      participation_base,
      participation_remainder,
      member_count,
      case
        when placement = 1 then 30
        when placement = 2 then 25
        when placement = 3 then 20
        else 10
      end as earned_pool
    from group_split
  ),
  earned_split as (
    select
      pool_key,
      participation_base,
      participation_remainder,
      floor(earned_pool::numeric / member_count)::integer as earned_base,
      (earned_pool - floor(earned_pool::numeric / member_count)::integer * member_count)::integer as earned_remainder,
      member_count
    from placement_pool
  ),
  ranked_members as (
    select
      rs.student_id,
      rs.pool_key,
      es.participation_base,
      es.participation_remainder,
      es.earned_base,
      es.earned_remainder,
      row_number() over (
        partition by rs.pool_key
        order by rs.avg_response_time_ms asc nulls last, rs.student_id
      ) as speed_rank
    from roster_with_stats rs
    join earned_split es on es.pool_key = rs.pool_key
  )
  insert into joule_transactions (student_id, surge_id, amount, type)
  select
    student_id,
    (select surge_id from live_rounds where id = p_round_id),
    participation_base + (case when speed_rank <= participation_remainder then 1 else 0 end),
    'surge_participation'
  from ranked_members
  where participation_base + (case when speed_rank <= participation_remainder then 1 else 0 end) > 0
  union all
  select
    student_id,
    (select surge_id from live_rounds where id = p_round_id),
    earned_base + (case when speed_rank <= earned_remainder then 1 else 0 end),
    'surge_earned'
  from ranked_members
  where earned_base + (case when speed_rank <= earned_remainder then 1 else 0 end) <> 0;
end;
$$;
revoke all on function public.complete_live_round(uuid) from public;
grant execute on function public.complete_live_round(uuid) to authenticated;

drop function if exists public.event_recent_scans(uuid, integer, text);
create or replace function public.event_recent_scans(p_event_id uuid, p_limit integer default 10)
returns table (student_name text, amount integer, flagged_geofence boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.can_manage_event(p_event_id) then
    raise exception 'not authorized';
  end if;
  return query
    select s.name, jt.amount, jt.flagged_geofence, jt.created_at
    from joule_transactions jt
    join students s on s.id = jt.student_id
    where jt.event_id = p_event_id and jt.type = 'event_scan'
    order by jt.created_at desc
    limit p_limit;
end;
$$;
revoke all on function public.event_recent_scans(uuid, integer) from public;
grant execute on function public.event_recent_scans(uuid, integer) to authenticated;

drop function if exists public.event_scan_metrics(uuid, text);
create or replace function public.event_scan_metrics(p_event_id uuid)
returns table (students_scanned integer, joules_distributed integer)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.can_manage_event(p_event_id) then
    raise exception 'not authorized';
  end if;
  return query
    select count(*)::integer, coalesce(sum(amount), 0)::integer
    from joule_transactions
    where event_id = p_event_id and type = 'event_scan';
end;
$$;
revoke all on function public.event_scan_metrics(uuid) from public;
grant execute on function public.event_scan_metrics(uuid) to authenticated;

drop function if exists public.current_qr_token(uuid, text);
create or replace function public.current_qr_token(p_event_id uuid)
returns table (token text, expires_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_epoch bigint := public.qr_epoch();
  v_event events;
begin
  if not public.can_manage_event(p_event_id) then
    raise exception 'not authorized';
  end if;
  select * into v_event from events where id = p_event_id;
  if v_event.id is null
     or v_event.attendance_opens_at is null or v_event.attendance_closes_at is null
     or now() not between v_event.attendance_opens_at and v_event.attendance_closes_at then
    return;
  end if;
  return query select
    public.qr_token_for_epoch(p_event_id, v_epoch),
    to_timestamp((v_epoch + 1) * 90);
end;
$$;
revoke all on function public.current_qr_token(uuid) from public;
grant execute on function public.current_qr_token(uuid) to authenticated;

drop function if exists public.start_event_attendance(uuid, integer, text);
create or replace function public.start_event_attendance(p_event_id uuid, p_duration_minutes integer default null)
returns table (attendance_opens_at timestamptz, attendance_closes_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  v_event events;
  v_duration integer;
begin
  if not public.can_manage_event(p_event_id) then
    raise exception 'not authorized';
  end if;
  select * into v_event from events where id = p_event_id;
  if v_event.id is null then
    raise exception 'event not found';
  end if;
  if v_event.type = 'surge' then
    raise exception 'surges are not checked in via QR';
  end if;

  v_duration := coalesce(p_duration_minutes, v_event.attendance_duration_minutes);
  if v_duration <= 0 then
    raise exception 'duration must be positive';
  end if;

  update events
  set attendance_opens_at = now(),
      attendance_closes_at = now() + (v_duration * interval '1 minute')
  where id = p_event_id
  returning events.attendance_opens_at, events.attendance_closes_at
  into attendance_opens_at, attendance_closes_at;

  insert into audit_log_entries (admin_id, action, details)
  values (auth.uid(), 'attendance_start', jsonb_build_object('event_id', p_event_id, 'duration_minutes', v_duration));

  return next;
end;
$$;
revoke all on function public.start_event_attendance(uuid, integer) from public;
grant execute on function public.start_event_attendance(uuid, integer) to authenticated;

drop function if exists public.reset_round_operator_token(uuid);
drop function if exists public.ensure_round_operator_token(uuid);
drop function if exists public.reset_event_operator_token(uuid);
drop function if exists public.ensure_event_operator_token(uuid);
drop function if exists public.is_valid_round_operator(uuid, text);
drop function if exists public.is_valid_event_operator(uuid, text);

alter table audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table audit_log_entries add constraint audit_log_entries_action_check
  check (action in (
    'force_reset', 'manual_joule_adjustment', 'csv_import', 'role_change',
    'event_create', 'event_edit', 'report_create', 'gallery_upload', 'live_round_create',
    'event_update_sent', 'attendance_start'
  ));

alter table live_rounds drop column if exists operator_token;
alter table events drop column if exists operator_token;
