-- 0045: row-level CSV export RPCs for the new admin Reports tab — the
-- actual gap against the Dean's stated top priority (participation data,
-- end of term, to plan future activities). Every existing report is
-- either per-event or a platform-wide aggregate; nothing today answers
-- "give me every student's attendance across every event a club ran this
-- term, as raw rows I can pivot myself in Power BI."
--
-- All five follow the exact club-scoping primitive already established in
-- admin_club_engagement() (migration 0039), extended with an optional
-- p_club_id so a Super Admin can also narrow to one club ("optionally one
-- club or all clubs," the originally agreed scope) — a club-scoped
-- Professor/Committee Member is always locked to their own club_id
-- regardless of what they'd pass, since v_scope_club_id only reads
-- p_club_id for a super_admin caller. p_season_id is optional too — null
-- means all time.
--
-- report_students() deliberately does NOT list every student for a
-- club-scoped caller — students have no club affiliation of their own in
-- this data model (decision 46, open participation) — it lists students
-- who actually have an event_registrations row for that club's events,
-- matching the "per club = per club's events" framing confirmed with the
-- user. Super Admin (with no club filter) gets every student.

-- migrate:up

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

create or replace function public.report_attendance(p_season_id uuid default null, p_club_id uuid default null)
returns table (
  event_name text, student_name text, student_email text,
  registered_at timestamptz, attended_at timestamptz
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
    select e.name, st.name, st.college_email, er.registered_at, er.attended_at
    from event_registrations er
    join events e on e.id = er.event_id
    join students st on st.id = er.student_id
    where (v_scope_club_id is null or e.club_id = v_scope_club_id)
      and (p_season_id is null or er.registered_at::date between v_start and v_end)
    order by er.registered_at desc;
end;
$$;
revoke all on function public.report_attendance(uuid, uuid) from public;
grant execute on function public.report_attendance(uuid, uuid) to authenticated;

create or replace function public.report_quiz_participation(p_season_id uuid default null, p_club_id uuid default null)
returns table (
  surge_name text, student_name text, student_email text, mode text, joined_at timestamptz
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
    select sg.name, st.name, st.college_email, 'async'::text, qgm.joined_at
    from quiz_group_members qgm
    join surges sg on sg.id = qgm.surge_id
    join students st on st.id = qgm.student_id
    where (v_scope_club_id is null or sg.club_id = v_scope_club_id)
      and (p_season_id is null or qgm.joined_at::date between v_start and v_end)
    union all
    select sg.name, st.name, st.college_email, 'live'::text, lrtm.joined_at
    from live_round_team_members lrtm
    join live_rounds lr on lr.id = lrtm.round_id
    join surges sg on sg.id = lr.surge_id
    join students st on st.id = lrtm.student_id
    where (v_scope_club_id is null or sg.club_id = v_scope_club_id)
      and (p_season_id is null or lrtm.joined_at::date between v_start and v_end)
    order by joined_at desc;
end;
$$;
revoke all on function public.report_quiz_participation(uuid, uuid) from public;
grant execute on function public.report_quiz_participation(uuid, uuid) to authenticated;

create or replace function public.report_joule_ledger(p_season_id uuid default null, p_club_id uuid default null)
returns table (
  student_name text, student_email text, type text, amount integer, source_name text, created_at timestamptz
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

  -- A manual Joule adjustment has neither event_id nor surge_id, so it has
  -- no derivable club — correctly excluded from a club-scoped export
  -- (coalesce(e.club_id, sg.club_id) is null, which never equals
  -- v_scope_club_id), since there's no principled way to attribute it to
  -- one specific club. Only visible in an unscoped (all-clubs) export.
  return query
    select
      st.name, st.college_email, jt.type, jt.amount,
      coalesce(e.name, sg.name, 'manual adjustment'),
      jt.created_at
    from joule_transactions jt
    join students st on st.id = jt.student_id
    left join events e on e.id = jt.event_id
    left join surges sg on sg.id = jt.surge_id
    where (v_scope_club_id is null or coalesce(e.club_id, sg.club_id) = v_scope_club_id)
      and (p_season_id is null or jt.created_at::date between v_start and v_end)
    order by jt.created_at desc;
end;
$$;
revoke all on function public.report_joule_ledger(uuid, uuid) from public;
grant execute on function public.report_joule_ledger(uuid, uuid) to authenticated;

-- migrate:down

drop function if exists public.report_joule_ledger(uuid, uuid);
drop function if exists public.report_quiz_participation(uuid, uuid);
drop function if exists public.report_attendance(uuid, uuid);
drop function if exists public.report_events(uuid, uuid);
drop function if exists public.report_students(uuid, uuid);
