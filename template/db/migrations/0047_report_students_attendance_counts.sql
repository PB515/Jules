-- 0047: report_students() gains the same three registration/attendance
-- counts report_events() just got (migration 0046) — total_registered,
-- total_attended, and not_attended — but per student instead of per
-- event. Scoped identically to the rest of the report: club-scoped
-- callers only see counts for events belonging to their own club, and a
-- season filter (when set) only counts registrations for events whose
-- event_date falls inside that season's range, same as
-- student_season_joules() already does for the Joule totals on this
-- same row.
--
-- Changes report_students()'s return shape, so this follows the
-- project's own standing rule (decisions 46-48): explicit DROP FUNCTION
-- before CREATE OR REPLACE.

-- migrate:up

drop function if exists public.report_students(uuid, uuid);

create or replace function public.report_students(p_season_id uuid default null, p_club_id uuid default null)
returns table (
  student_id uuid, name text, email text,
  season_joules integer, lifetime_joules integer, tier text, streak integer,
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
      s.id, s.name, s.college_email,
      public.student_season_joules(s.id, p_season_id),
      public.student_lifetime_joules(s.id),
      public.tier_for_joules(public.student_season_joules(s.id, p_season_id)),
      public.student_attendance_streak(s.id),
      coalesce(reg.total_registered, 0)::integer,
      coalesce(reg.total_attended, 0)::integer,
      (coalesce(reg.total_registered, 0) - coalesce(reg.total_attended, 0))::integer
    from students s
    left join lateral (
      select
        count(er.id) as total_registered,
        count(er.id) filter (where er.attended_at is not null) as total_attended
      from event_registrations er
      join events e on e.id = er.event_id
      where er.student_id = s.id
        and (v_scope_club_id is null or e.club_id = v_scope_club_id)
        and (p_season_id is null or e.event_date::date between v_start and v_end)
    ) reg on true
    where v_scope_club_id is null
       or exists (
         select 1
         from event_registrations er
         join events e on e.id = er.event_id
         where er.student_id = s.id and e.club_id = v_scope_club_id
       )
    order by s.name;
end;
$$;
revoke all on function public.report_students(uuid, uuid) from public;
grant execute on function public.report_students(uuid, uuid) to authenticated;

-- migrate:down

drop function if exists public.report_students(uuid, uuid);

create or replace function public.report_students(p_season_id uuid default null, p_club_id uuid default null)
returns table (
  student_id uuid, name text, email text,
  season_joules integer, lifetime_joules integer, tier text, streak integer
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_club_id uuid;
  v_scope_club_id uuid;
begin
  if not (public.is_committee_member_or_professor() or public.is_super_admin()) then
    raise exception 'not authorized';
  end if;
  select a.club_id into v_club_id from admins a where a.id = auth.uid();
  v_scope_club_id := case when public.is_super_admin() then p_club_id else v_club_id end;

  return query
    select
      s.id, s.name, s.college_email,
      public.student_season_joules(s.id, p_season_id),
      public.student_lifetime_joules(s.id),
      public.tier_for_joules(public.student_season_joules(s.id, p_season_id)),
      public.student_attendance_streak(s.id)
    from students s
    where v_scope_club_id is null
       or exists (
         select 1
         from event_registrations er
         join events e on e.id = er.event_id
         where er.student_id = s.id and e.club_id = v_scope_club_id
       )
    order by s.name;
end;
$$;
revoke all on function public.report_students(uuid, uuid) from public;
grant execute on function public.report_students(uuid, uuid) to authenticated;
