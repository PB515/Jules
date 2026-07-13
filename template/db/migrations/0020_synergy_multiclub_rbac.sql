-- 0020_synergy_multiclub_rbac — Pivot Phase 1 (CLAUDE.md decision 45): the
-- multi-club data model + the 3-tier RBAC the professor asked for
-- (Student / Committee Member / Professor), replacing the single-club
-- Owner/Officer/Volunteer model.
--
-- Shape:
--   - New `clubs` table. `events` and `surges` each get a required `club_id`
--     FK (which club owns/organized it). Students get NO club FK at all —
--     open participation was confirmed with the user: any student can
--     register for any club's activities, so there is no membership roster.
--   - `admins.role` collapses to 'professor' | 'committee_member'. The old
--     fine-grained, auto-expiring Volunteer role is dropped (a deliberate
--     simplification — the professor named exactly 3 tiers). A Committee
--     Member is scoped to exactly one club via `admins.club_id`; a Professor
--     is platform-wide (club_id is null) and is the only role that can
--     manually adjust a student's points (admin_adjust_joules stays
--     Professor-only, matching the old Owner-only gate).
--   - Every RLS policy / RPC that used to check is_owner()/is_officer_or_owner()
--     is re-audited here, not just renamed: events/surges/questions WRITES are
--     now club-scoped (a Committee Member can only create/edit their own
--     club's rows; a Professor can manage every club). Reads that were
--     already platform-wide for staff (the System Ledger reports, the full
--     Joule ledger, Live Round content) stay platform-wide for now — scoping
--     those to "your club's data only" is flagged as a follow-up, not a
--     silent decision (see CLAUDE.md Known Open Items), since the plan's
--     explicit Phase 1 ask was write-scoping, not a full read audit.
--
-- Live data at the time this was written: 3 admin rows (all role='owner'),
-- 0 events, 3 surges (no live/complete events yet) — confirmed by querying
-- production directly before writing this migration, not assumed. No
-- 'officer'/'volunteer' rows existed, so the role-value backfill below is
-- exercised on real data but isn't the risky part of this migration; the
-- club_id backfill for the 3 existing surges is.

-- migrate:up

-- ---------- clubs ----------

create table if not exists clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 160),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_clubs_slug on clubs (slug);

alter table clubs enable row level security;

-- ★ PLACEHOLDER club, same convention as decisions 9/10 (season calendar,
-- email domain) — a fixed, deterministic id so this migration is re-runnable
-- and every environment backfills events/surges/admins to the same row.
-- Replace with the real 12-13 club roster before this ships for real use.
insert into clubs (id, name, slug, description)
values (
  '00000000-0000-0000-0000-000000000001',
  'General Club',
  'general',
  'Placeholder club seeded by the multi-club migration. Replace with the real club roster (see CLAUDE.md Known Open Items).'
)
on conflict (id) do nothing;

-- ---------- admins: club_id + role collapse ----------

alter table admins add column if not exists club_id uuid references clubs(id);

-- Must drop the old check constraint BEFORE writing the new role values —
-- 'professor'/'committee_member' would violate the original
-- ('owner','officer','volunteer') constraint otherwise.
alter table admins drop constraint if exists admins_role_check;

update admins set role = 'professor' where role = 'owner';
update admins set role = 'committee_member', club_id = '00000000-0000-0000-0000-000000000001'
  where role = 'officer';
-- Volunteer is dropped as a tier entirely; any existing volunteer admin rows
-- become Committee Members on the placeholder club rather than being deleted,
-- preserving the audit trail (an admin's roster history shouldn't vanish).
update admins set role = 'committee_member', club_id = '00000000-0000-0000-0000-000000000001'
  where role = 'volunteer';

alter table admins add constraint admins_role_check check (role in ('professor', 'committee_member'));

alter table admins drop constraint if exists admins_volunteer_event_fk;
alter table admins drop column if exists volunteer_event_id;

alter table admins add constraint admins_club_scope_valid check (
  (role = 'professor' and club_id is null) or
  (role = 'committee_member' and club_id is not null)
);

-- ---------- events / surges: club_id ----------

alter table events add column if not exists club_id uuid references clubs(id);
update events set club_id = '00000000-0000-0000-0000-000000000001' where club_id is null;
alter table events alter column club_id set not null;

alter table surges add column if not exists club_id uuid references clubs(id);
update surges set club_id = '00000000-0000-0000-0000-000000000001' where club_id is null;
alter table surges alter column club_id set not null;

-- ---------- drop every policy that depends on the old RBAC functions ----------
-- Postgres tracks a hard dependency between a policy and the functions its
-- USING/WITH CHECK expressions call — the old functions cannot be dropped
-- while any of these still exist.

drop policy if exists "owner reads institution settings" on institution_settings;
drop policy if exists "owner updates institution settings" on institution_settings;
drop policy if exists "owner reads all students (vault)" on students;
drop policy if exists "owner updates any student" on students;
drop policy if exists "owner reads all admins" on admins;
drop policy if exists "owner manages seasons" on seasons;
drop policy if exists "officer or owner creates/edits events" on events;
drop policy if exists "officer or owner updates events" on events;
drop policy if exists "owner deletes events" on events;
drop policy if exists "officer or owner manages surges" on surges;
drop policy if exists "officer or owner manages questions" on questions;
drop policy if exists "officer or owner reads full ledger" on joule_transactions;
drop policy if exists "officer or owner reads all answers" on surge_answers;
drop policy if exists "owner reads audit log" on audit_log_entries;
drop policy if exists "officer or owner manages live rounds" on live_rounds;
drop policy if exists "officer or owner reads all live answers" on live_round_answers;
drop policy if exists "officer or owner manages event reports" on event_reports;
drop policy if exists "officer or owner manages gallery images" on gallery_images;
drop policy if exists "officer or owner writes gallery bucket" on storage.objects;
drop policy if exists "officer or owner updates gallery bucket" on storage.objects;
drop policy if exists "officer or owner deletes gallery bucket" on storage.objects;

-- ---------- drop the old RBAC helpers ----------

drop function if exists public.is_volunteer_for_event(uuid);
drop function if exists public.is_officer_or_owner();
drop function if exists public.is_owner();

-- ---------- new RBAC helpers ----------

create or replace function public.is_professor()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from admins a where a.id = auth.uid() and a.role = 'professor');
$$;
revoke all on function public.is_professor() from public;
grant execute on function public.is_professor() to authenticated;

create or replace function public.is_committee_member()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from admins a where a.id = auth.uid() and a.role = 'committee_member');
$$;
revoke all on function public.is_committee_member() from public;
grant execute on function public.is_committee_member() to authenticated;

create or replace function public.is_committee_member_or_professor()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from admins a where a.id = auth.uid() and a.role in ('professor', 'committee_member')
  );
$$;
revoke all on function public.is_committee_member_or_professor() from public;
grant execute on function public.is_committee_member_or_professor() to authenticated;

-- The scoping primitive every club-owned write policy/RPC builds on: a
-- Professor may manage any club; a Committee Member only their own
-- (admins.club_id). coalesce'd to false everywhere it's used against a
-- possibly-nonexistent row — a bare `select ... where id = p_x` returns NULL
-- for zero rows, and `if not null` is neither true nor false in PL/pgSQL, so
-- an unguarded null here would silently SKIP the authorization check for a
-- bad id instead of rejecting it.
create or replace function public.can_manage_club(p_club_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_professor() or exists (
    select 1 from admins a
    where a.id = auth.uid() and a.role = 'committee_member' and a.club_id = p_club_id
  );
$$;
revoke all on function public.can_manage_club(uuid) from public;
grant execute on function public.can_manage_club(uuid) to authenticated;

create or replace function public.can_manage_event(p_event_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select public.can_manage_club(e.club_id) from events e where e.id = p_event_id),
    false
  );
$$;
revoke all on function public.can_manage_event(uuid) from public;
grant execute on function public.can_manage_event(uuid) to authenticated;

create or replace function public.can_manage_surge(p_surge_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select public.can_manage_club(s.club_id) from surges s where s.id = p_surge_id),
    false
  );
$$;
revoke all on function public.can_manage_surge(uuid) from public;
grant execute on function public.can_manage_surge(uuid) to authenticated;

-- ---------- recreate policies: renamed, plus club scoping on events/surges/questions ----------

create policy "professor reads institution settings" on institution_settings
  for select using (public.is_professor());
create policy "professor updates institution settings" on institution_settings
  for update using (public.is_professor()) with check (public.is_professor());

create policy "professor reads all students (vault)" on students
  for select using (public.is_professor());
create policy "professor updates any student" on students
  for update using (public.is_professor()) with check (public.is_professor());

create policy "professor reads all admins" on admins
  for select using (public.is_professor());

create policy "professor manages seasons" on seasons
  for all using (public.is_professor()) with check (public.is_professor());

-- events: read stays broad (authenticated reads events, untouched — students
-- need this for the public calendar and, in a later phase, registration).
-- Writes are club-scoped; only a Professor can delete.
create policy "committee member or professor creates events" on events
  for insert with check (public.can_manage_club(club_id));
create policy "committee member or professor updates events" on events
  for update using (public.can_manage_event(id)) with check (public.can_manage_club(club_id));
create policy "professor deletes events" on events
  for delete using (public.is_professor());

-- surges: read stays broad (authenticated reads surges, untouched).
create policy "committee member or professor manages surges" on surges
  for all using (public.can_manage_surge(id)) with check (public.can_manage_club(club_id));

-- questions: scoped via the parent surge's club, not a direct club_id column.
create policy "committee member or professor manages questions" on questions
  for all using (public.can_manage_surge(surge_id)) with check (public.can_manage_surge(surge_id));

create policy "committee member or professor reads full ledger" on joule_transactions
  for select using (public.is_committee_member_or_professor());

create policy "committee member or professor reads all answers" on surge_answers
  for select using (public.is_committee_member_or_professor());

create policy "professor reads audit log" on audit_log_entries
  for select using (public.is_professor());

-- Live Round club-scoping is enforced at the RPC level (host_create_round /
-- host_advance_round, below) rather than in this blanket policy, since a
-- round's club lives on its surge, not on live_rounds itself.
create policy "committee member or professor manages live rounds" on live_rounds
  for all using (public.is_committee_member_or_professor()) with check (public.is_committee_member_or_professor());
create policy "committee member or professor reads all live answers" on live_round_answers
  for select using (public.is_committee_member_or_professor());

create policy "committee member or professor manages event reports" on event_reports
  for all using (public.is_committee_member_or_professor()) with check (public.is_committee_member_or_professor());

create policy "committee member or professor manages gallery images" on gallery_images
  for all using (public.is_committee_member_or_professor()) with check (public.is_committee_member_or_professor());

create policy "committee member or professor writes gallery bucket" on storage.objects
  for insert with check (bucket_id = 'gallery' and public.is_committee_member_or_professor());
create policy "committee member or professor updates gallery bucket" on storage.objects
  for update using (bucket_id = 'gallery' and public.is_committee_member_or_professor())
  with check (bucket_id = 'gallery' and public.is_committee_member_or_professor());
create policy "committee member or professor deletes gallery bucket" on storage.objects
  for delete using (bucket_id = 'gallery' and public.is_committee_member_or_professor());

-- clubs table's own RLS: everyone authenticated can read the club list
-- (needed for registration/browsing pickers everywhere); only a Professor
-- can create/edit/delete clubs.
create policy "authenticated reads clubs" on clubs
  for select using (auth.uid() is not null);
create policy "professor manages clubs" on clubs
  for all using (public.is_professor()) with check (public.is_professor());

-- ---------- recreate every RPC body that called a renamed function ----------

create or replace function public.trg_students_restrict_self_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_professor() or current_setting('jules.trusted_write', true) = 'on' then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.streak_days is distinct from old.streak_days
     or new.last_active_date is distinct from old.last_active_date
     or new.college_email is distinct from old.college_email then
    raise exception 'only name and phone are self-editable';
  end if;
  return new;
end;
$$;

create or replace function public.current_qr_token(p_event_id uuid)
returns table (token text, expires_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_epoch bigint := public.qr_epoch();
begin
  if not public.can_manage_event(p_event_id) then
    raise exception 'not authorized';
  end if;
  return query select
    public.qr_token_for_epoch(p_event_id, v_epoch),
    to_timestamp((v_epoch + 1) * 90);
end;
$$;

create or replace function public.event_scan_metrics(p_event_id uuid)
returns table (students_scanned integer, joules_distributed integer)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.can_manage_event(p_event_id) then
    raise exception 'not authorized';
  end if;
  return query
    select count(*)::integer, coalesce(sum(amount), 0)::integer
    from joule_transactions
    where event_id = p_event_id and type = 'event_scan';
end;
$$;

create or replace function public.event_recent_scans(p_event_id uuid, p_limit integer default 10)
returns table (student_name text, amount integer, flagged_geofence boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.can_manage_event(p_event_id) then
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

-- admin_adjust_joules stays the one power only the top tier gets (decision 45
-- point 11: "professors will have power to manipulate points").
create or replace function public.admin_adjust_joules(p_student_id uuid, p_amount integer, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_professor() then
    raise exception 'not authorized';
  end if;
  if p_amount = 0 then
    raise exception 'amount must be non-zero';
  end if;

  insert into joule_transactions (student_id, amount, type, created_by_admin)
  values (p_student_id, p_amount, 'admin_manual_adjustment', auth.uid());

  insert into audit_log_entries (admin_id, action, target_student_id, details)
  values (auth.uid(), 'manual_joule_adjustment', p_student_id,
          jsonb_build_object('amount', p_amount, 'reason', p_reason));
end;
$$;

create or replace function public.admin_set_student_status(p_student_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_professor() then
    raise exception 'not authorized';
  end if;
  if p_status not in ('active', 'locked') then
    raise exception 'invalid status';
  end if;
  perform set_config('jules.trusted_write', 'on', true);
  update students set status = p_status where id = p_student_id;
end;
$$;

-- admin_create_admin / admin_set_role: p_volunteer_event_id -> p_club_id.
-- Postgres refuses to rename an input parameter via CREATE OR REPLACE
-- ("cannot change name of input parameter") — an explicit DROP is required
-- first, even though the type signature (uuid, text, text, text, uuid) is
-- otherwise unchanged.
drop function if exists public.admin_create_admin(uuid, text, text, text, uuid);
drop function if exists public.admin_set_role(uuid, text, uuid);

create or replace function public.admin_create_admin(
  p_user_id uuid, p_name text, p_email text, p_role text, p_club_id uuid default null
)
returns admins
language plpgsql security definer set search_path = public
as $$
declare
  v_row admins;
begin
  if not public.is_professor() then
    raise exception 'not authorized';
  end if;
  if p_role not in ('professor', 'committee_member') then
    raise exception 'invalid role';
  end if;
  if p_role = 'committee_member' and p_club_id is null then
    raise exception 'a committee member must be scoped to a club';
  end if;
  if p_role = 'professor' and p_club_id is not null then
    raise exception 'a professor is platform-wide and cannot be scoped to a club';
  end if;

  insert into admins (id, name, email, role, club_id)
  values (p_user_id, p_name, p_email, p_role, p_club_id)
  returning * into v_row;

  insert into audit_log_entries (admin_id, action, details)
  values (auth.uid(), 'role_change',
          jsonb_build_object('target_admin_id', p_user_id, 'new_role', p_role, 'club_id', p_club_id, 'created', true));

  return v_row;
end;
$$;

create or replace function public.admin_set_role(p_admin_id uuid, p_role text, p_club_id uuid default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_professor() then
    raise exception 'not authorized';
  end if;
  if p_role not in ('professor', 'committee_member') then
    raise exception 'invalid role';
  end if;
  if p_role = 'committee_member' and p_club_id is null then
    raise exception 'a committee member must be scoped to a club';
  end if;
  if p_role = 'professor' and p_club_id is not null then
    raise exception 'a professor is platform-wide and cannot be scoped to a club';
  end if;

  update admins set role = p_role, club_id = p_club_id where id = p_admin_id;

  insert into audit_log_entries (admin_id, action, details)
  values (auth.uid(), 'role_change', jsonb_build_object('target_admin_id', p_admin_id, 'new_role', p_role, 'club_id', p_club_id));
end;
$$;

-- log_csv_import is now scoped to the surge's own club, not "any staff" —
-- a Committee Member can only leave an import audit trail for their own
-- club's surge (matches the surges/questions write policies above).
create or replace function public.log_csv_import(p_surge_id uuid, p_details jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.can_manage_surge(p_surge_id) then
    raise exception 'not authorized';
  end if;
  insert into audit_log_entries (admin_id, action, details)
  values (auth.uid(), 'csv_import', p_details || jsonb_build_object('surge_id', p_surge_id));
end;
$$;

-- monthly_engagement / event_engagement_totals stay platform-wide reads for
-- any staff tier (System Ledger) — per-club scoping of these reports is
-- flagged as a follow-up in CLAUDE.md, not attempted here (Phase 1's explicit
-- scope was write-path club scoping, not a full reporting audit).
create or replace function public.monthly_engagement()
returns table (month date, event_type text, total_joules integer, scan_count integer)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_committee_member_or_professor() then
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

create or replace function public.event_engagement_totals()
returns table (event_id uuid, total_attendees integer, total_joules integer)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_committee_member_or_professor() then
    raise exception 'not authorized';
  end if;
  return query
    select jt.event_id, count(*)::integer, sum(jt.amount)::integer
    from joule_transactions jt
    where jt.type = 'event_scan'
    group by jt.event_id;
end;
$$;

-- Student Data Vault stays Professor-only (matches the old Owner-only gate).
create or replace function public.admin_student_totals()
returns table (
  id uuid, name text, college_email text, phone text, status text,
  streak_days integer, season_joules integer, lifetime_joules integer, tier text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_professor() then
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

create or replace function public.surge_leaderboard(p_surge_id uuid)
returns table (
  student_id uuid, name text, total_amount integer,
  avg_response_time_ms numeric, earliest_completed_at timestamptz, rank bigint
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from surges where id = p_surge_id;
  if v_status is null then
    raise exception 'surge not found';
  end if;
  if v_status <> 'complete' and not public.is_committee_member_or_professor() then
    raise exception 'surge has not closed yet';
  end if;

  return query
    select
      s.student_id, st.name,
      sum(s.amount)::integer as total_amount,
      avg(s.response_time_ms) as avg_response_time_ms,
      max(sa.created_at) as earliest_completed_at,
      rank() over (
        order by sum(s.amount) desc, avg(s.response_time_ms) asc nulls last, max(sa.created_at) asc
      )
    from joule_transactions s
    join students st on st.id = s.student_id
    left join surge_answers sa on sa.student_id = s.student_id
      and sa.question_id in (select id from questions where surge_id = p_surge_id)
    where s.surge_id = p_surge_id and s.type = 'surge_correct_answer'
    group by s.student_id, st.name
    order by total_amount desc;
end;
$$;

-- host_create_round / host_advance_round: club-scoped via the round's surge,
-- not a blanket "any staff" check — a Committee Member may only host a round
-- for a surge belonging to their own club.
create or replace function public.host_create_round(p_surge_id uuid)
returns live_rounds
language plpgsql security definer set search_path = public
as $$
declare
  v_code text;
  v_row live_rounds;
begin
  if not exists (select 1 from surges where id = p_surge_id) then
    raise exception 'surge not found';
  end if;
  if not public.can_manage_surge(p_surge_id) then
    raise exception 'not authorized';
  end if;

  loop
    v_code := upper(substr(md5(random()::text), 1, 4));
    exit when not exists (select 1 from live_rounds where room_code = v_code and phase <> 'complete');
  end loop;

  insert into live_rounds (surge_id, room_code, created_by)
  values (p_surge_id, v_code, auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.host_advance_round(p_round_id uuid)
returns live_rounds
language plpgsql security definer set search_path = public
as $$
declare
  v_round live_rounds;
  v_question_count integer;
  v_row live_rounds;
begin
  select * into v_round from live_rounds where id = p_round_id;
  if v_round.id is null then
    raise exception 'round not found';
  end if;
  if not public.can_manage_surge(v_round.surge_id) then
    raise exception 'not authorized';
  end if;

  select count(*) into v_question_count from questions where surge_id = v_round.surge_id;

  if v_round.phase = 'lobby' then
    update live_rounds set phase = 'question', question_index = 0, question_started_at = now()
    where id = p_round_id returning * into v_row;
  elsif v_round.phase = 'question' then
    update live_rounds set phase = 'reveal'
    where id = p_round_id returning * into v_row;
  elsif v_round.phase = 'reveal' then
    update live_rounds set phase = 'leaderboard'
    where id = p_round_id returning * into v_row;
  elsif v_round.phase = 'leaderboard' then
    if v_round.question_index + 1 < v_question_count then
      update live_rounds
      set phase = 'question', question_index = question_index + 1, question_started_at = now()
      where id = p_round_id returning * into v_row;
    else
      update live_rounds set phase = 'complete' where id = p_round_id returning * into v_row;
    end if;
  else
    raise exception 'round has already ended';
  end if;

  return v_row;
end;
$$;

-- migrate:down

drop function if exists public.host_advance_round(uuid);
drop function if exists public.host_create_round(uuid);

create or replace function public.surge_leaderboard(p_surge_id uuid)
returns table (
  student_id uuid, name text, total_amount integer,
  avg_response_time_ms numeric, earliest_completed_at timestamptz, rank bigint
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from surges where id = p_surge_id;
  if v_status is null then
    raise exception 'surge not found';
  end if;
  if v_status <> 'complete' and not public.is_officer_or_owner() then
    raise exception 'surge has not closed yet';
  end if;

  return query
    select
      s.student_id, st.name,
      sum(s.amount)::integer as total_amount,
      avg(s.response_time_ms) as avg_response_time_ms,
      max(sa.created_at) as earliest_completed_at,
      rank() over (
        order by sum(s.amount) desc, avg(s.response_time_ms) asc nulls last, max(sa.created_at) asc
      )
    from joule_transactions s
    join students st on st.id = s.student_id
    left join surge_answers sa on sa.student_id = s.student_id
      and sa.question_id in (select id from questions where surge_id = p_surge_id)
    where s.surge_id = p_surge_id and s.type = 'surge_correct_answer'
    group by s.student_id, st.name
    order by total_amount desc;
end;
$$;

drop function if exists public.admin_student_totals();
drop function if exists public.event_engagement_totals();
drop function if exists public.monthly_engagement();
drop function if exists public.log_csv_import(uuid, jsonb);
drop function if exists public.admin_set_role(uuid, text, uuid);
drop function if exists public.admin_create_admin(uuid, text, text, text, uuid);

create or replace function public.admin_create_admin(
  p_user_id uuid, p_name text, p_email text, p_role text, p_volunteer_event_id uuid default null
)
returns admins
language plpgsql security definer set search_path = public
as $$
declare
  v_row admins;
begin
  if not public.is_owner() then
    raise exception 'not authorized';
  end if;
  if p_role not in ('owner', 'officer', 'volunteer') then
    raise exception 'invalid role';
  end if;

  insert into admins (id, name, email, role, volunteer_event_id)
  values (p_user_id, p_name, p_email, p_role, p_volunteer_event_id)
  returning * into v_row;

  insert into audit_log_entries (admin_id, action, details)
  values (auth.uid(), 'role_change',
          jsonb_build_object('target_admin_id', p_user_id, 'new_role', p_role, 'created', true));

  return v_row;
end;
$$;

create or replace function public.admin_set_role(p_admin_id uuid, p_role text, p_volunteer_event_id uuid default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'not authorized';
  end if;
  if p_role not in ('owner', 'officer', 'volunteer') then
    raise exception 'invalid role';
  end if;

  update admins set role = p_role, volunteer_event_id = p_volunteer_event_id where id = p_admin_id;

  insert into audit_log_entries (admin_id, action, details)
  values (auth.uid(), 'role_change', jsonb_build_object('target_admin_id', p_admin_id, 'new_role', p_role));
end;
$$;

drop function if exists public.admin_set_student_status(uuid, text);
drop function if exists public.admin_adjust_joules(uuid, integer, text);
drop function if exists public.event_recent_scans(uuid, integer);
drop function if exists public.event_scan_metrics(uuid);
drop function if exists public.current_qr_token(uuid);

drop policy if exists "professor manages clubs" on clubs;
drop policy if exists "authenticated reads clubs" on clubs;
drop policy if exists "committee member or professor deletes gallery bucket" on storage.objects;
drop policy if exists "committee member or professor updates gallery bucket" on storage.objects;
drop policy if exists "committee member or professor writes gallery bucket" on storage.objects;
drop policy if exists "committee member or professor manages gallery images" on gallery_images;
drop policy if exists "committee member or professor manages event reports" on event_reports;
drop policy if exists "committee member or professor reads all live answers" on live_round_answers;
drop policy if exists "committee member or professor manages live rounds" on live_rounds;
drop policy if exists "professor reads audit log" on audit_log_entries;
drop policy if exists "committee member or professor reads all answers" on surge_answers;
drop policy if exists "committee member or professor reads full ledger" on joule_transactions;
drop policy if exists "committee member or professor manages questions" on questions;
drop policy if exists "committee member or professor manages surges" on surges;
drop policy if exists "professor deletes events" on events;
drop policy if exists "committee member or professor updates events" on events;
drop policy if exists "committee member or professor creates events" on events;
drop policy if exists "professor manages seasons" on seasons;
drop policy if exists "professor reads all admins" on admins;
drop policy if exists "professor updates any student" on students;
drop policy if exists "professor reads all students (vault)" on students;
drop policy if exists "professor updates institution settings" on institution_settings;
drop policy if exists "professor reads institution settings" on institution_settings;

drop function if exists public.can_manage_surge(uuid);
drop function if exists public.can_manage_event(uuid);
drop function if exists public.can_manage_club(uuid);
drop function if exists public.is_committee_member_or_professor();
drop function if exists public.is_committee_member();
drop function if exists public.is_professor();

create or replace function public.is_owner()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from admins a where a.id = auth.uid() and a.role = 'owner');
$$;
revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

create or replace function public.is_officer_or_owner()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from admins a where a.id = auth.uid() and a.role in ('owner', 'officer')
  );
$$;
revoke all on function public.is_officer_or_owner() from public;
grant execute on function public.is_officer_or_owner() to authenticated;

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
revoke all on function public.is_volunteer_for_event(uuid) from public;
grant execute on function public.is_volunteer_for_event(uuid) to authenticated;

create or replace function public.trg_students_restrict_self_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_owner() or current_setting('jules.trusted_write', true) = 'on' then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.streak_days is distinct from old.streak_days
     or new.last_active_date is distinct from old.last_active_date
     or new.college_email is distinct from old.college_email then
    raise exception 'only name and phone are self-editable';
  end if;
  return new;
end;
$$;

create policy "owner reads institution settings" on institution_settings
  for select using (public.is_owner());
create policy "owner updates institution settings" on institution_settings
  for update using (public.is_owner()) with check (public.is_owner());
create policy "owner reads all students (vault)" on students
  for select using (public.is_owner());
create policy "owner updates any student" on students
  for update using (public.is_owner()) with check (public.is_owner());
create policy "owner reads all admins" on admins
  for select using (public.is_owner());
create policy "owner manages seasons" on seasons
  for all using (public.is_owner()) with check (public.is_owner());
create policy "officer or owner creates/edits events" on events
  for insert with check (public.is_officer_or_owner());
create policy "officer or owner updates events" on events
  for update using (public.is_officer_or_owner()) with check (public.is_officer_or_owner());
create policy "owner deletes events" on events
  for delete using (public.is_owner());
create policy "officer or owner manages surges" on surges
  for all using (public.is_officer_or_owner()) with check (public.is_officer_or_owner());
create policy "officer or owner manages questions" on questions
  for all using (public.is_officer_or_owner()) with check (public.is_officer_or_owner());
create policy "officer or owner reads full ledger" on joule_transactions
  for select using (public.is_officer_or_owner());
create policy "officer or owner reads all answers" on surge_answers
  for select using (public.is_officer_or_owner());
create policy "owner reads audit log" on audit_log_entries
  for select using (public.is_owner());
create policy "officer or owner manages live rounds" on live_rounds
  for all using (public.is_officer_or_owner()) with check (public.is_officer_or_owner());
create policy "officer or owner reads all live answers" on live_round_answers
  for select using (public.is_officer_or_owner());
create policy "officer or owner manages event reports" on event_reports
  for all using (public.is_officer_or_owner()) with check (public.is_officer_or_owner());
create policy "officer or owner manages gallery images" on gallery_images
  for all using (public.is_officer_or_owner()) with check (public.is_officer_or_owner());
create policy "officer or owner writes gallery bucket" on storage.objects
  for insert with check (bucket_id = 'gallery' and public.is_officer_or_owner());
create policy "officer or owner updates gallery bucket" on storage.objects
  for update using (bucket_id = 'gallery' and public.is_officer_or_owner())
  with check (bucket_id = 'gallery' and public.is_officer_or_owner());
create policy "officer or owner deletes gallery bucket" on storage.objects
  for delete using (bucket_id = 'gallery' and public.is_officer_or_owner());

alter table surges alter column club_id drop not null;
alter table surges drop column if exists club_id;

alter table events alter column club_id drop not null;
alter table events drop column if exists club_id;

alter table admins drop constraint if exists admins_club_scope_valid;
alter table admins add column if not exists volunteer_event_id uuid;
alter table admins add constraint admins_volunteer_event_fk foreign key (volunteer_event_id) references events(id);
alter table admins drop constraint if exists admins_role_check;
update admins set role = 'owner' where role = 'professor';
update admins set role = 'officer' where role = 'committee_member';
alter table admins add constraint admins_role_check check (role in ('owner', 'officer', 'volunteer'));
alter table admins drop column if exists club_id;

drop policy if exists "professor manages clubs" on clubs;
drop policy if exists "authenticated reads clubs" on clubs;
drop table if exists clubs;
