-- 0009_jules_ledger_reports — System Ledger (spec §7): month-over-month
-- engagement stacked by event type, and per-event attendee/Joule totals.
-- Officer/Owner only — this is aggregate engagement data, not the Vault.

-- migrate:up

create or replace function public.monthly_engagement()
returns table (month date, event_type text, total_joules integer, scan_count integer)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_officer_or_owner() then
    raise exception 'not authorized';
  end if;
  return query
    select
      date_trunc('month', jt.created_at)::date,
      e.type,
      sum(jt.amount)::integer,
      count(*)::integer
    from joule_transactions jt
    join events e on e.id = jt.event_id
    where jt.type = 'event_scan'
    group by 1, 2
    order by 1;
end;
$$;
revoke all on function public.monthly_engagement() from public;
grant execute on function public.monthly_engagement() to authenticated;

create or replace function public.event_engagement_totals()
returns table (event_id uuid, total_attendees integer, total_joules integer)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_officer_or_owner() then
    raise exception 'not authorized';
  end if;
  return query
    select jt.event_id, count(*)::integer, sum(jt.amount)::integer
    from joule_transactions jt
    where jt.type = 'event_scan'
    group by jt.event_id;
end;
$$;
revoke all on function public.event_engagement_totals() from public;
grant execute on function public.event_engagement_totals() to authenticated;

-- Student Data Vault listing (spec §7, Owner only). student_season_joules /
-- student_lifetime_joules are internal-only (0004) — this is the one
-- authorized place a full student roster + totals is assembled.
create or replace function public.admin_student_totals()
returns table (
  id uuid, name text, college_email text, phone text, status text,
  streak_days integer, season_joules integer, lifetime_joules integer, tier text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'not authorized';
  end if;
  return query
    select
      s.id, s.name, s.college_email, s.phone, s.status, s.streak_days,
      public.student_season_joules(s.id),
      public.student_lifetime_joules(s.id),
      public.tier_for_joules(public.student_season_joules(s.id))
    from students s
    order by s.name;
end;
$$;
revoke all on function public.admin_student_totals() from public;
grant execute on function public.admin_student_totals() to authenticated;

-- migrate:down

drop function if exists public.admin_student_totals();
drop function if exists public.event_engagement_totals();
drop function if exists public.monthly_engagement();
