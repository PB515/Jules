-- 0052: per-registration "volunteer" role, so a single event can credit two
-- different amounts through the exact same QR/scan flow.
--
-- Context: a real event has both participants and a small number of
-- volunteers actually running it (setup, registration desk, etc.) — the
-- volunteers should earn the higher "Volunteer task" rate (15 SP) while
-- everyone else gets the event's normal "Participation" rate (10 SP), but
-- there's only one event, one QR code, one attendance window. Splitting
-- into two separate events/QR codes was considered and rejected: with a
-- live crowd there's a real risk of the wrong person scanning the wrong
-- code, either overpaying a participant or underpaying a volunteer with no
-- one noticing.
--
-- Design: volunteers are always known ahead of time (they're recruited to
-- help run the event), so they register through the app like everyone
-- else, and staff flags their specific registration row as 'volunteer'
-- beforehand. At scan time, redeem_event_scan looks up the caller's own
-- registration role and pays out accordingly — same QR, same attendance
-- window, same attended_at/streak stamp for both roles, zero door
-- confusion. A walk-in with no prior registration always gets the
-- participant rate, matching decision 47's existing walk-in behavior —
-- volunteers are never walk-ins.
--
-- volunteer_joule_value is per-event (not a global constant) since the
-- user explicitly wants it configurable, not fixed at the existing
-- "Volunteer task" event-type rate.

-- migrate:up

alter table events add column if not exists volunteer_joule_value integer not null default 15;
alter table events add constraint events_volunteer_joule_value_check check (volunteer_joule_value > 0);

alter table event_registrations add column if not exists role text not null default 'participant';
alter table event_registrations add constraint event_registrations_role_check check (role in ('participant', 'volunteer'));

-- redeem_event_scan: body-only change (same signature as 0050's version),
-- so a plain create or replace is safe, no DROP FUNCTION needed. Only the
-- amount computation changes -- everything else (geofence, unique-scan
-- guard, attended_at stamp) is untouched.
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
  v_role text;
  v_amount integer;
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

  select er.role into v_role from event_registrations er
    where er.event_id = p_event_id and er.student_id = auth.uid();
  v_amount := case when v_role = 'volunteer' then v_event.volunteer_joule_value else v_event.joule_value end;

  begin
    insert into joule_transactions (student_id, event_id, amount, type, flagged_geofence)
    values (auth.uid(), p_event_id, v_amount, 'event_scan', v_flagged);
  exception when unique_violation then
    raise exception 'already credited for this event';
  end;

  update event_registrations
  set attended_at = now()
  where event_id = p_event_id and student_id = auth.uid() and attended_at is null;

  return query
    select v_amount,
           public.student_season_joules(auth.uid()),
           public.tier_for_joules(public.student_season_joules(auth.uid())),
           v_flagged;
end;
$$;

-- Staff-only: flags a specific, already-registered student as a volunteer
-- (or reverts them to participant) for one event. Same authorization
-- primitive as every other event-scoped write (can_manage_event) -- any
-- staff who can manage this event can set roles for it, independent of
-- which admin UI page happens to expose the toggle.
create or replace function public.set_registration_role(p_event_id uuid, p_student_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.can_manage_event(p_event_id) then
    raise exception 'not authorized';
  end if;
  if p_role not in ('participant', 'volunteer') then
    raise exception 'invalid role';
  end if;

  update event_registrations set role = p_role
  where event_id = p_event_id and student_id = p_student_id;
  if not found then
    raise exception 'registration not found';
  end if;

  perform public.log_admin_action(
    'registration_role_set',
    jsonb_build_object('event_id', p_event_id, 'role', p_role),
    p_student_id
  );
end;
$$;
revoke all on function public.set_registration_role(uuid, uuid, text) from public;
grant execute on function public.set_registration_role(uuid, uuid, text) to authenticated;

alter table audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table audit_log_entries add constraint audit_log_entries_action_check
  check (action in (
    'force_reset', 'manual_joule_adjustment', 'csv_import', 'role_change',
    'event_create', 'event_edit', 'report_create', 'gallery_upload', 'live_round_create',
    'event_update_sent', 'attendance_start', 'operator_link_created', 'operator_link_reset',
    'registration_role_set'
  ));

-- migrate:down

alter table audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table audit_log_entries add constraint audit_log_entries_action_check
  check (action in (
    'force_reset', 'manual_joule_adjustment', 'csv_import', 'role_change',
    'event_create', 'event_edit', 'report_create', 'gallery_upload', 'live_round_create',
    'event_update_sent', 'attendance_start', 'operator_link_created', 'operator_link_reset'
  ));

drop function if exists public.set_registration_role(uuid, uuid, text);

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

alter table event_registrations drop constraint if exists event_registrations_role_check;
alter table event_registrations drop column if exists role;

alter table events drop constraint if exists events_volunteer_joule_value_check;
alter table events drop column if exists volunteer_joule_value;
