-- 0006_jules_rpcs — every write to a sensitive table happens through one of
-- these SECURITY DEFINER functions. None of joule_transactions, surge_answers,
-- questions(correct_option), or admins has a direct client write path — this
-- file is the complete list of ways state can change for those tables.

-- migrate:up

-- Internal: bump the daily streak. Marked "trusted write" so the self-update
-- restriction trigger (0005) lets streak_days/last_active_date through even
-- though the caller is a student, not the Owner.
create or replace function public._bump_streak(p_student_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform set_config('jules.trusted_write', 'on', true); -- transaction-local
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

-- ---------- onboarding ("The Connection") ----------
create or replace function public.complete_onboarding(p_name text, p_phone text)
returns students
language plpgsql security definer set search_path = public
as $$
declare
  v_email text;
  v_row students;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    raise exception 'no auth user found';
  end if;
  if not public.is_email_domain_allowed(v_email) then
    raise exception 'college email domain is not allowed';
  end if;

  insert into students (id, name, college_email, phone)
  values (auth.uid(), p_name, v_email, p_phone)
  returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.complete_onboarding(text, text) from public;
grant execute on function public.complete_onboarding(text, text) to authenticated;

-- ---------- QR event check-in ----------
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

  perform public._bump_streak(auth.uid());

  return query
    select v_event.joule_value,
           public.student_season_joules(auth.uid()),
           public.tier_for_joules(public.student_season_joules(auth.uid())),
           v_flagged;
end;
$$;
revoke all on function public.redeem_event_scan(uuid, text, double precision, double precision) from public;
grant execute on function public.redeem_event_scan(uuid, text, double precision, double precision) to authenticated;

-- ---------- Live Surge Mode ----------

-- Pre-fetch once per entry (spec §11) — never correct_option, never per-question polling.
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
  if not exists (select 1 from students where id = auth.uid()) then
    raise exception 'not a student';
  end if;
  select status into v_status from surges where id = p_surge_id;
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
revoke all on function public.start_surge(uuid) from public;
grant execute on function public.start_surge(uuid) to authenticated;

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
revoke all on function public.submit_surge_answer(uuid, text, integer) from public;
grant execute on function public.submit_surge_answer(uuid, text, integer) to authenticated;

-- Surge Matrix reveal — one aggregation pass, computed only once the Surge has
-- closed (spec §11), never live per-answer. Reveals name + total only (never
-- email/phone), matching the privacy scoping in docs/project-spec.md §10.
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
  if v_status <> 'complete' and not public.is_officer_or_owner() then
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
    where s.surge_id = p_surge_id and s.type = 'surge_correct_answer'
    group by s.student_id, st.name
    order by total_amount desc;
end;
$$;
revoke all on function public.surge_leaderboard(uuid) from public;
grant execute on function public.surge_leaderboard(uuid) to authenticated;

-- ---------- admin: manual Joule adjustment (Owner only, audit-logged) ----------
create or replace function public.admin_adjust_joules(p_student_id uuid, p_amount integer, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'not authorized';
  end if;
  if p_amount = 0 then
    raise exception 'amount must be non-zero';
  end if;

  insert into joule_transactions (student_id, amount, type, created_by_admin)
  values (p_student_id, p_amount, 'admin_manual_adjustment', auth.uid());

  insert into audit_log_entries (admin_id, action, target_student_id, details)
  values (auth.uid(), 'manual_joule_adjustment', p_student_id,
          jsonb_build_object('amount', p_amount, 'reason', p_reason));
end;
$$;
revoke all on function public.admin_adjust_joules(uuid, integer, text) from public;
grant execute on function public.admin_adjust_joules(uuid, integer, text) to authenticated;

-- ---------- admin: lock / unlock a student (Owner only) ----------
create or replace function public.admin_set_student_status(p_student_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'not authorized';
  end if;
  if p_status not in ('active', 'locked') then
    raise exception 'invalid status';
  end if;
  perform set_config('jules.trusted_write', 'on', true);
  update students set status = p_status where id = p_student_id;
end;
$$;
revoke all on function public.admin_set_student_status(uuid, text) from public;
grant execute on function public.admin_set_student_status(uuid, text) to authenticated;

-- ---------- admin: roster management (Owner only, audit-logged role_change) ----------
create or replace function public.admin_create_admin(
  p_user_id uuid, p_name text, p_email text, p_role text, p_volunteer_event_id uuid default null
)
returns admins
language plpgsql security definer set search_path = public
as $$
declare
  v_row admins;
begin
  if not public.is_owner() then
    raise exception 'not authorized';
  end if;
  if p_role not in ('owner', 'officer', 'volunteer') then
    raise exception 'invalid role';
  end if;

  insert into admins (id, name, email, role, volunteer_event_id)
  values (p_user_id, p_name, p_email, p_role, p_volunteer_event_id)
  returning * into v_row;

  insert into audit_log_entries (admin_id, action, details)
  values (auth.uid(), 'role_change',
          jsonb_build_object('target_admin_id', p_user_id, 'new_role', p_role, 'created', true));

  return v_row;
end;
$$;
revoke all on function public.admin_create_admin(uuid, text, text, text, uuid) from public;
grant execute on function public.admin_create_admin(uuid, text, text, text, uuid) to authenticated;

create or replace function public.admin_set_role(p_admin_id uuid, p_role text, p_volunteer_event_id uuid default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'not authorized';
  end if;
  if p_role not in ('owner', 'officer', 'volunteer') then
    raise exception 'invalid role';
  end if;

  update admins set role = p_role, volunteer_event_id = p_volunteer_event_id where id = p_admin_id;

  insert into audit_log_entries (admin_id, action, details)
  values (auth.uid(), 'role_change', jsonb_build_object('target_admin_id', p_admin_id, 'new_role', p_role));
end;
$$;
revoke all on function public.admin_set_role(uuid, text, uuid) from public;
grant execute on function public.admin_set_role(uuid, text, uuid) to authenticated;

-- ---------- admin: CSV import audit trail ----------
create or replace function public.log_csv_import(p_surge_id uuid, p_details jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_officer_or_owner() then
    raise exception 'not authorized';
  end if;
  insert into audit_log_entries (admin_id, action, details)
  values (auth.uid(), 'csv_import', p_details || jsonb_build_object('surge_id', p_surge_id));
end;
$$;
revoke all on function public.log_csv_import(uuid, jsonb) from public;
grant execute on function public.log_csv_import(uuid, jsonb) to authenticated;

-- migrate:down

drop function if exists public.log_csv_import(uuid, jsonb);
drop function if exists public.admin_set_role(uuid, text, uuid);
drop function if exists public.admin_create_admin(uuid, text, text, text, uuid);
drop function if exists public.admin_set_student_status(uuid, text);
drop function if exists public.admin_adjust_joules(uuid, integer, text);
drop function if exists public.surge_leaderboard(uuid);
drop function if exists public.submit_surge_answer(uuid, text, integer);
drop function if exists public.start_surge(uuid);
drop function if exists public.redeem_event_scan(uuid, text, double precision, double precision);
drop function if exists public.complete_onboarding(text, text);
drop function if exists public._bump_streak(uuid);
