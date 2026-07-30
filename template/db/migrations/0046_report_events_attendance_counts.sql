-- 0046: report_events() gains three registration/attendance counts per
-- event — total_registered, total_attended (of those registered), and
-- not_attended (registered but never scanned in). The Events CSV export
-- previously only had joule_value, no participation numbers at all, so a
-- staff member downloading it to plan future events had no way to see
-- which events actually drew a crowd versus which ones people signed up
-- for and skipped.
--
-- not_attended is computed as registered - attended rather than a second
-- count(*) filter, since the two numbers must always add up to the total
-- by construction — no risk of the two counts drifting from a query typo.
--
-- Changes report_events()'s return shape, so this follows the project's
-- own standing rule (decisions 46-48): explicit DROP FUNCTION before
-- CREATE OR REPLACE, since CREATE OR REPLACE FUNCTION cannot alter an
-- existing function's declared return columns.

-- migrate:up

drop function if exists public.report_events(uuid, uuid);

create or replace function public.report_events(p_season_id uuid default null, p_club_id uuid default null)
returns table (
  event_id uuid, name text, club_name text, type text, event_date timestamptz, location text, joule_value integer,
  total_registered integer, total_attended integer, not_attended integer
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_club_id uuid;
  v_scope_club_id uuid;
  v_start date;
  v_end date;
begin
  if not (public.is_committee_member_or_professor() or public.is_super_admin()) then
    raise exception 'not authorized';
  end if;
  select a.club_id into v_club_id from admins a where a.id = auth.uid();
  v_scope_club_id := case when public.is_super_admin() then p_club_id else v_club_id end;
  if p_season_id is not null then
    select s.start_date, s.end_date into v_start, v_end from seasons s where s.id = p_season_id;
  end if;

  return query
    select
      e.id, e.name, c.name, e.type, e.event_date, e.location, e.joule_value,
      count(er.id)::integer,
      count(er.id) filter (where er.attended_at is not null)::integer,
      (count(er.id) - count(er.id) filter (where er.attended_at is not null))::integer
    from events e
    join clubs c on c.id = e.club_id
    left join event_registrations er on er.event_id = e.id
    where (v_scope_club_id is null or e.club_id = v_scope_club_id)
      and (p_season_id is null or e.event_date::date between v_start and v_end)
    group by e.id, e.name, c.name, e.type, e.event_date, e.location, e.joule_value
    order by e.event_date desc;
end;
$$;
revoke all on function public.report_events(uuid, uuid) from public;
grant execute on function public.report_events(uuid, uuid) to authenticated;

-- migrate:down

drop function if exists public.report_events(uuid, uuid);

create or replace function public.report_events(p_season_id uuid default null, p_club_id uuid default null)
returns table (
  event_id uuid, name text, club_name text, type text, event_date timestamptz, location text, joule_value integer
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_club_id uuid;
  v_scope_club_id uuid;
  v_start date;
  v_end date;
begin
  if not (public.is_committee_member_or_professor() or public.is_super_admin()) then
    raise exception 'not authorized';
  end if;
  select a.club_id into v_club_id from admins a where a.id = auth.uid();
  v_scope_club_id := case when public.is_super_admin() then p_club_id else v_club_id end;
  if p_season_id is not null then
    select s.start_date, s.end_date into v_start, v_end from seasons s where s.id = p_season_id;
  end if;

  return query
    select e.id, e.name, c.name, e.type, e.event_date, e.location, e.joule_value
    from events e
    join clubs c on c.id = e.club_id
    where (v_scope_club_id is null or e.club_id = v_scope_club_id)
      and (p_season_id is null or e.event_date::date between v_start and v_end)
    order by e.event_date desc;
end;
$$;
revoke all on function public.report_events(uuid, uuid) from public;
grant execute on function public.report_events(uuid, uuid) to authenticated;
