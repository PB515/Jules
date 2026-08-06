-- 0050: decouple the QR attendance window from events.event_date entirely.
--
-- Context: the scan window has been tied to the event's scheduled time
-- since 0038 (event_date -> +20 minutes). Real events run late — a 3pm
-- event actually starting at 6pm means the window has already opened and
-- closed against nobody by the time anyone is there to scan. The person
-- actually running attendance in practice is a Committee Member (student),
-- not the Professor. Fix: attendance is now started on demand — a real
-- "Start attendance" action stamps attendance_opens_at/attendance_closes_at
-- from the actual moment it's pressed, independent of when the event was
-- scheduled. Restarting it (e.g. a second wave of latecomers, or the event
-- was started too early) just resets the window fresh from "now" — no
-- separate reopen/stop-early RPC, matching the user's own "simplifying
-- things, less interaction" framing.

-- migrate:up

alter table events
  add column if not exists attendance_duration_minutes integer not null default 20,
  add column if not exists attendance_opens_at timestamptz,
  add column if not exists attendance_closes_at timestamptz;

-- redeem_event_scan / current_qr_token: body-only change (no signature
-- change), so a plain create or replace is safe, no DROP FUNCTION needed.
-- Both now check the new stored window instead of event_date -> +20min.
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

  if v_event.attendance_opens_at is null or v_event.attendance_closes_at is null then
    raise exception 'attendance hasn''t been started for this event yet';
  end if;
  if now() not between v_event.attendance_opens_at and v_event.attendance_closes_at then
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

-- Starts (or restarts) the attendance window right now, for
-- attendance_duration_minutes (or an explicit override). Gated on the same
-- primitive current_qr_token/redeem_event_scan already trust.
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

  -- Called directly from the client (Grid Station), not through a Server
  -- Action wrapper, so the audit write lives here — same posture as
  -- admin_adjust_joules/admin_set_student_status, both also client-called
  -- security definer RPCs that log themselves rather than relying on a
  -- Server Action call site to do it.
  insert into audit_log_entries (admin_id, action, details)
  values (auth.uid(), 'attendance_start', jsonb_build_object('event_id', p_event_id, 'duration_minutes', v_duration));

  return next;
end;
$$;
revoke all on function public.start_event_attendance(uuid, integer) from public;
grant execute on function public.start_event_attendance(uuid, integer) to authenticated;

-- Audit trail: track who actually started attendance for which event.
alter table audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table audit_log_entries add constraint audit_log_entries_action_check
  check (action in (
    'force_reset', 'manual_joule_adjustment', 'csv_import', 'role_change',
    'event_create', 'event_edit', 'report_create', 'gallery_upload', 'live_round_create',
    'event_update_sent', 'attendance_start'
  ));

-- migrate:down

alter table audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table audit_log_entries add constraint audit_log_entries_action_check
  check (action in (
    'force_reset', 'manual_joule_adjustment', 'csv_import', 'role_change',
    'event_create', 'event_edit', 'report_create', 'gallery_upload', 'live_round_create',
    'event_update_sent'
  ));

drop function if exists public.start_event_attendance(uuid, integer);

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
  if v_event.id is null or now() not between v_event.event_date and (v_event.event_date + interval '20 minutes') then
    return;
  end if;
  return query select
    public.qr_token_for_epoch(p_event_id, v_epoch),
    to_timestamp((v_epoch + 1) * 90);
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

  if now() not between v_event.event_date and (v_event.event_date + interval '20 minutes') then
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

alter table events
  drop column if exists attendance_opens_at,
  drop column if exists attendance_closes_at,
  drop column if exists attendance_duration_minutes;
