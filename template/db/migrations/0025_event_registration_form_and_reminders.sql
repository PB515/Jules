-- 0025_event_registration_form_and_reminders — lets a club committee attach
-- an external registration form (Google/Microsoft Form) to an event, and
-- gives the app enough to compute in-app reminders (day-before, venue
-- change) without any push/webhook infrastructure.
--
-- Registration model, confirmed with the user: tapping "Register" in the app
-- records the registration in our own database via the existing
-- register_for_event() (unchanged behavior) AND opens the external form in a
-- new tab in the same action — the form is the club's own supplementary data
-- collection (team size, dietary needs, etc.), not our source of truth for
-- "is this student registered." A student may register even when no form is
-- set (registration_form_url is optional).
--
-- Venue-change detection: rather than build a separate edit-history/audit
-- table, event_registrations snapshots the event's location at the moment of
-- registration (location_at_registration). Comparing that snapshot to the
-- event's current location is enough to know "this changed since I signed
-- up" — computed live on the Dashboard, no new table, no cron.

-- migrate:up

alter table events add column if not exists registration_form_url text;
alter table event_registrations add column if not exists location_at_registration text;

-- register_for_event() returns the `event_registrations` composite type
-- directly (not an explicit `returns table (...)` column list), so adding a
-- column to the underlying table doesn't hit the "cannot change return type"
-- restriction (decisions 46-48) — CREATE OR REPLACE is safe here.
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
    insert into event_registrations (event_id, student_id, location_at_registration)
    values (p_event_id, auth.uid(), v_event.location)
    returning * into v_row;
  exception when unique_violation then
    raise exception 'already registered for this event';
  end;

  return v_row;
end;
$$;
revoke all on function public.register_for_event(uuid) from public;
grant execute on function public.register_for_event(uuid) to authenticated;

-- migrate:down

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

alter table event_registrations drop column if exists location_at_registration;
alter table events drop column if exists registration_form_url;
