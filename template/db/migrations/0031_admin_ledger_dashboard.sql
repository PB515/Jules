-- 0031_admin_ledger_dashboard — Phase D: a fuller graphical System Ledger
-- ("Power BI-like" per the feedback doc, applying the same treatment
-- already given to the student side). Three new committee_member_or_professor
-- reads, matching monthly_engagement()/event_engagement_totals()'s existing
-- platform-wide-for-any-staff-tier posture (per-club scoping of reports is
-- an already-flagged follow-up, not attempted here).

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
revoke all on function public.admin_dashboard_summary() from public;
grant execute on function public.admin_dashboard_summary() to authenticated;

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
revoke all on function public.admin_tier_distribution() from public;
grant execute on function public.admin_tier_distribution() to authenticated;

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
revoke all on function public.admin_club_engagement() from public;
grant execute on function public.admin_club_engagement() to authenticated;

-- migrate:down

drop function if exists public.admin_club_engagement();
drop function if exists public.admin_tier_distribution();
drop function if exists public.admin_dashboard_summary();
