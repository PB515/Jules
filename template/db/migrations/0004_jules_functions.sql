-- 0004_jules_functions — RBAC helpers, computed totals, QR token rotation.
-- All SECURITY DEFINER functions set a locked search_path (same pattern as
-- lib/patterns/has_role.sql) so they can't be tricked via search_path hijacking.

-- migrate:up

-- ---------- RBAC helpers ----------

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from admins a where a.id = auth.uid());
$$;

create or replace function public.admin_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from admins a where a.id = auth.uid();
$$;

create or replace function public.is_owner()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from admins a where a.id = auth.uid() and a.role = 'owner');
$$;

create or replace function public.is_officer_or_owner()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from admins a where a.id = auth.uid() and a.role in ('owner', 'officer')
  );
$$;

-- A volunteer is scoped to exactly one event and only while that event's scan
-- window is open (event_date - 15min .. coalesce(end_date, event_date) + 15min).
-- Access "auto-expires when the event ends" by computing this on every call —
-- no cron nulling a column, no stale-grant risk (spec §7/§9).
create or replace function public.is_volunteer_for_event(p_event_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from admins a
    join events e on e.id = a.volunteer_event_id
    where a.id = auth.uid()
      and a.role = 'volunteer'
      and a.volunteer_event_id = p_event_id
      and now() between (e.event_date - interval '15 minutes')
                     and (coalesce(e.end_date, e.event_date) + interval '15 minutes')
  );
$$;

-- ---------- email domain check (pre-signup, called by anon too) ----------

create or replace function public.is_email_domain_allowed(p_email text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from institution_settings s, unnest(s.allowed_domains) d
    where lower(p_email) like '%@' || lower(d)
  );
$$;
revoke all on function public.is_email_domain_allowed(text) from public;
grant execute on function public.is_email_domain_allowed(text) to anon, authenticated;

-- BEFORE INSERT defense-in-depth: even if a client bypassed the pre-signup
-- check, the row-level constraint stops an invalid domain from ever landing.
create or replace function public.trg_students_validate_domain()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_email_domain_allowed(new.college_email) then
    raise exception 'college_email domain is not on the allowed_domains list';
  end if;
  return new;
end;
$$;

drop trigger if exists students_validate_domain on students;
create trigger students_validate_domain
  before insert or update of college_email on students
  for each row execute function public.trg_students_validate_domain();

-- ---------- tiers + computed Joule totals (ledger is the source of truth) ----------

create or replace function public.tier_for_joules(p_joules integer)
returns text
language sql immutable
as $$
  select case
    when p_joules >= 1000 then 'plasma'
    when p_joules >= 600  then 'current'
    when p_joules >= 300  then 'volt'
    else 'ember'
  end;
$$;

-- The current season = the one whose date range contains today; if there's a
-- gap between seasons, falls back to the most recently ended one so the UI
-- always has something to show rather than nothing.
create or replace function public.active_season()
returns seasons
language sql stable
as $$
  select s.* from seasons s
  where current_date between s.start_date and s.end_date
  order by s.start_date desc
  limit 1;
$$;

-- Internal helpers only — NOT exposed to authenticated/anon. Postgres grants
-- EXECUTE to PUBLIC by default for new functions; without this explicit
-- revoke, any client could call e.g. student_lifetime_joules(<any uuid>) via
-- RPC and read another student's private totals (a real cross-user leak —
-- caught during the self-consistency pass, not by external report). Callable
-- only from other SECURITY DEFINER functions owned the same way (my_totals
-- below), which execute as the owner regardless of these grants.
create or replace function public.student_lifetime_joules(p_student_id uuid)
returns integer
language sql stable
as $$
  select coalesce(sum(amount), 0)::integer
  from joule_transactions
  where student_id = p_student_id;
$$;
revoke all on function public.student_lifetime_joules(uuid) from public;

create or replace function public.student_season_joules(p_student_id uuid, p_season_id uuid default null)
returns integer
language plpgsql stable
as $$
declare
  v_season seasons;
  v_total integer;
begin
  if p_season_id is not null then
    select * into v_season from seasons where id = p_season_id;
  else
    select * into v_season from public.active_season();
  end if;

  if v_season.id is null then
    return 0;
  end if;

  select coalesce(sum(amount), 0)::integer into v_total
  from joule_transactions
  where student_id = p_student_id
    and created_at >= v_season.start_date
    and created_at < (v_season.end_date + 1);

  return v_total;
end;
$$;
revoke all on function public.student_season_joules(uuid, uuid) from public;

-- Per-student totals in one read — backs the Node Dashboard hero numbers.
-- SECURITY DEFINER (not invoker): the hardcoded `where s.id = auth.uid()`
-- means it can only ever return the caller's own row, so running as the
-- owner (to reach the internal helpers above) is safe.
create or replace function public.my_totals()
returns table (
  season_joules integer,
  lifetime_joules integer,
  tier text,
  streak_days integer,
  status text
)
language sql stable security definer set search_path = public
as $$
  select
    public.student_season_joules(s.id),
    public.student_lifetime_joules(s.id),
    public.tier_for_joules(public.student_season_joules(s.id)),
    s.streak_days,
    s.status
  from students s
  where s.id = auth.uid();
$$;
revoke all on function public.my_totals() from public;
grant execute on function public.my_totals() to authenticated;

-- ---------- QR token rotation (deterministic, no stored/mutable token) ----------

create or replace function public.qr_epoch(p_at timestamptz default now())
returns bigint
language sql immutable
as $$
  select floor(extract(epoch from p_at) / 90)::bigint;
$$;

create or replace function public.qr_secret()
returns text
language sql stable security definer set search_path = public
as $$
  select value from app_secrets where key = 'qr_secret';
$$;

create or replace function public.qr_token_for_epoch(p_event_id uuid, p_epoch bigint)
returns text
language sql stable security definer set search_path = public, extensions
as $$
  select upper(substring(
    encode(
      hmac(
        convert_to(p_event_id::text || ':' || p_epoch::text, 'UTF8'),
        convert_to(public.qr_secret(), 'UTF8'),
        'sha256'
      ),
      'hex'
    )
    from 1 for 10
  ));
$$;

-- Admin-facing: current rotating token + when it next rotates. Officer/owner
-- can operate any event; a Volunteer only their own assigned event, and only
-- while its scan window is open (matches the Scan Station's actual RBAC —
-- spec §7 gives Volunteers the Scan Station itself, not just standing nearby).
create or replace function public.current_qr_token(p_event_id uuid)
returns table (token text, expires_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_epoch bigint := public.qr_epoch();
begin
  if not (public.is_officer_or_owner() or public.is_volunteer_for_event(p_event_id)) then
    raise exception 'not authorized';
  end if;
  return query select
    public.qr_token_for_epoch(p_event_id, v_epoch),
    to_timestamp((v_epoch + 1) * 90);
end;
$$;
grant execute on function public.current_qr_token(uuid) to authenticated;

-- Live Scan Station metrics: students scanned + Joules distributed so far, plus
-- the most recent scans feed (spec §7). Same RBAC as current_qr_token.
create or replace function public.event_scan_metrics(p_event_id uuid)
returns table (students_scanned integer, joules_distributed integer)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not (public.is_officer_or_owner() or public.is_volunteer_for_event(p_event_id)) then
    raise exception 'not authorized';
  end if;
  return query
    select count(*)::integer, coalesce(sum(amount), 0)::integer
    from joule_transactions
    where event_id = p_event_id and type = 'event_scan';
end;
$$;
revoke all on function public.event_scan_metrics(uuid) from public;
grant execute on function public.event_scan_metrics(uuid) to authenticated;

create or replace function public.event_recent_scans(p_event_id uuid, p_limit integer default 10)
returns table (student_name text, amount integer, flagged_geofence boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not (public.is_officer_or_owner() or public.is_volunteer_for_event(p_event_id)) then
    raise exception 'not authorized';
  end if;
  return query
    select s.name, jt.amount, jt.flagged_geofence, jt.created_at
    from joule_transactions jt
    join students s on s.id = jt.student_id
    where jt.event_id = p_event_id and jt.type = 'event_scan'
    order by jt.created_at desc
    limit p_limit;
end;
$$;
revoke all on function public.event_recent_scans(uuid, integer) from public;
grant execute on function public.event_recent_scans(uuid, integer) to authenticated;

-- migrate:down

drop function if exists public.event_recent_scans(uuid, integer);
drop function if exists public.event_scan_metrics(uuid);
drop function if exists public.current_qr_token(uuid);
drop function if exists public.qr_token_for_epoch(uuid, bigint);
drop function if exists public.qr_secret();
drop function if exists public.qr_epoch(timestamptz);
drop function if exists public.my_totals();
drop function if exists public.student_season_joules(uuid, uuid);
drop function if exists public.student_lifetime_joules(uuid);
drop function if exists public.active_season();
drop function if exists public.tier_for_joules(integer);
drop trigger if exists students_validate_domain on students;
drop function if exists public.trg_students_validate_domain();
drop function if exists public.is_email_domain_allowed(text);
drop function if exists public.is_volunteer_for_event(uuid);
drop function if exists public.is_officer_or_owner();
drop function if exists public.is_owner();
drop function if exists public.admin_role();
drop function if exists public.is_admin();
