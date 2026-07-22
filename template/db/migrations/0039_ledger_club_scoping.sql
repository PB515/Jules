-- 0039: club-scope the three System Ledger RPCs added in 0031
-- (admin_dashboard_summary, admin_tier_distribution, admin_club_engagement)
-- — a real gap caught by live-testing the 0038 RBAC rework: these were
-- added AFTER the original monthly_engagement()/event_engagement_totals()
-- audit list was drawn up, so they were missed entirely and stayed fully
-- platform-wide for any staff tier (professor, committee_member) after
-- Professor became club-scoped. Confirmed live: a club Professor's System
-- Ledger showed all 9 clubs' engagement numbers and a platform-wide
-- student/event/Joule count instead of just their own club's.
--
-- students has no club FK (open participation, decision 46), so
-- "total_students"/tier distribution can't be scoped by a direct column —
-- scoped instead to students who have a registration for one of the
-- caller's club's events, the same legitimate-need shape used by the
-- "staff reads registered students for own club events" policy (0038).

-- migrate:up

create or replace function public.admin_dashboard_summary()
returns table (
  total_students integer,
  total_clubs integer,
  total_events integer,
  total_lifetime_joules integer
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_club_id uuid;
begin
  if not public.is_committee_member_or_professor() and not public.is_super_admin() then
    raise exception 'not authorized';
  end if;

  if public.is_super_admin() then
    return query
      select
        (select count(*)::integer from students),
        (select count(*)::integer from clubs),
        (select count(*)::integer from events where type <> 'surge'),
        (select coalesce(sum(amount), 0)::integer from joule_transactions);
    return;
  end if;

  select club_id into v_club_id from admins where id = auth.uid();
  return query
    select
      (select count(distinct er.student_id)::integer
         from event_registrations er join events e on e.id = er.event_id
         where e.club_id = v_club_id),
      1,
      (select count(*)::integer from events where club_id = v_club_id and type <> 'surge'),
      (select coalesce(sum(jt.amount), 0)::integer
         from joule_transactions jt join events e on e.id = jt.event_id
         where e.club_id = v_club_id);
end;
$$;

create or replace function public.admin_tier_distribution()
returns table (tier text, student_count integer)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_club_id uuid;
begin
  if not public.is_committee_member_or_professor() and not public.is_super_admin() then
    raise exception 'not authorized';
  end if;
  select club_id into v_club_id from admins where id = auth.uid();

  return query
    select t.tier, count(*)::integer
    from (
      select public.tier_for_joules(public.student_season_joules(s.id)) as tier
      from students s
      where public.is_super_admin() or exists (
        select 1 from event_registrations er join events e on e.id = er.event_id
        where er.student_id = s.id and e.club_id = v_club_id
      )
    ) t
    group by t.tier;
end;
$$;

create or replace function public.admin_club_engagement()
returns table (club_id uuid, club_name text, total_joules integer, total_attendees integer)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_club_id uuid;
begin
  if not public.is_committee_member_or_professor() and not public.is_super_admin() then
    raise exception 'not authorized';
  end if;
  select club_id into v_club_id from admins where id = auth.uid();

  return query
    select
      c.id,
      c.name,
      coalesce(sum(jt.amount), 0)::integer,
      count(distinct jt.student_id)::integer
    from clubs c
    left join events e on e.club_id = c.id
    left join joule_transactions jt on jt.event_id = e.id and jt.type = 'event_scan'
    where public.is_super_admin() or c.id = v_club_id
    group by c.id, c.name
    order by c.name;
end;
$$;

-- migrate:down

create or replace function public.admin_dashboard_summary()
returns table (
  total_students integer,
  total_clubs integer,
  total_events integer,
  total_lifetime_joules integer
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_committee_member_or_professor() then
    raise exception 'not authorized';
  end if;
  return query
    select
      (select count(*)::integer from students),
      (select count(*)::integer from clubs),
      (select count(*)::integer from events where type <> 'surge'),
      (select coalesce(sum(amount), 0)::integer from joule_transactions);
end;
$$;

create or replace function public.admin_tier_distribution()
returns table (tier text, student_count integer)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_committee_member_or_professor() then
    raise exception 'not authorized';
  end if;
  return query
    select t.tier, count(*)::integer
    from (
      select public.tier_for_joules(public.student_season_joules(s.id)) as tier
      from students s
    ) t
    group by t.tier;
end;
$$;

create or replace function public.admin_club_engagement()
returns table (club_id uuid, club_name text, total_joules integer, total_attendees integer)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_committee_member_or_professor() then
    raise exception 'not authorized';
  end if;
  return query
    select
      c.id,
      c.name,
      coalesce(sum(jt.amount), 0)::integer,
      count(distinct jt.student_id)::integer
    from clubs c
    left join events e on e.club_id = c.id
    left join joule_transactions jt on jt.event_id = e.id and jt.type = 'event_scan'
    group by c.id, c.name
    order by c.name;
end;
$$;
