-- 0038: 3-tier admin RBAC (super_admin platform-wide, professor and
-- committee_member both club-scoped), and a tighter, one-sided QR scan
-- window (event start -> +20 minutes, replacing the old +/-15 minute one).
--
-- Context: the pivot's 2-tier model (decision 46) made "professor"
-- platform-wide and "committee_member" club-scoped. The real operating
-- model is one Professor per club (club-scoped, same as Committee Member),
-- Committee Member loses QR/scanner access entirely (report-writing +
-- event creation only), and a new top tier, Super Admin, becomes the only
-- platform-wide role. Confirmed with the user: every admin screen becomes
-- club-scoped now, not just the ones explicitly named, closing the
-- long-standing "System Ledger/full ledger/Gallery/Live Round answers/
-- event_registrations stay platform-wide for any staff" Known Open Item
-- for good. All 13 existing "professor" admin rows are demo/test accounts
-- and auto-promote to super_admin, preserving today's access under the new
-- name — confirmed with the user, no per-row migration needed.
--
-- Leverage point: can_manage_club(club_id) is the one scoping primitive
-- can_manage_event()/can_manage_surge() both delegate to, and nearly every
-- RPC/RLS policy in the app already routes through one of those three.
-- Redefining can_manage_club() to treat 'professor' the same way
-- 'committee_member' already works (own club only, via admins.club_id),
-- plus a super_admin bypass, re-scopes most of the app automatically with
-- no other edits (current_qr_token, event_scan_metrics, event_recent_scans,
-- log_csv_import, host_create_round/host_advance_round, the events/surges/
-- questions write policies).

-- migrate:up

-- ---------- admins: 3-role shape ----------
-- club_id null <=> super_admin; club_id not null <=> professor or
-- committee_member. Backfill first (every existing 'professor' row today
-- has club_id is null, so this is unambiguous), then swap constraints —
-- writing data before dropping the old constraint would violate it
-- (the exact ordering bug hit repeatedly in decisions 46/47/49's own
-- migrations; done correctly here from the start).
alter table admins drop constraint if exists admins_club_scope_valid;
alter table admins drop constraint if exists admins_role_check;

update admins set role = 'super_admin' where role = 'professor';

alter table admins add constraint admins_role_check
  check (role in ('super_admin', 'professor', 'committee_member'));
alter table admins add constraint admins_club_scope_valid check (
  (role = 'super_admin' and club_id is null) or
  (role in ('professor', 'committee_member') and club_id is not null)
);

-- ---------- new helper + redefined scoping primitive ----------
create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from admins a where a.id = auth.uid() and a.role = 'super_admin');
$$;
revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- is_professor()/is_committee_member()/is_committee_member_or_professor()
-- are unchanged (still just role-string checks) — only what "professor"
-- MEANS changes, via this redefinition and the per-site moves below.
create or replace function public.can_manage_club(p_club_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_super_admin() or exists (
    select 1 from admins a
    where a.id = auth.uid() and a.role in ('professor', 'committee_member') and a.club_id = p_club_id
  );
$$;

-- ---------- platform-wide power: is_professor() -> is_super_admin() ----------
create or replace function public.admin_adjust_joules(p_student_id uuid, p_amount integer, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_super_admin() then
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
  if not public.is_super_admin() then
    raise exception 'not authorized';
  end if;
  if p_status not in ('active', 'locked') then
    raise exception 'invalid status';
  end if;
  perform set_config('jules.trusted_write', 'on', true);
  update students set status = p_status where id = p_student_id;
end;
$$;

-- admin_create_admin/admin_set_role: roster management (who gets which
-- role, for which club) is platform-wide power — a club Professor
-- shouldn't be able to create or reassign staff for other clubs, and the
-- original functions had no such restriction to begin with. Moved to
-- is_super_admin(), and the role/club validation extended for the new
-- 3-value role.
create or replace function public.admin_create_admin(
  p_user_id uuid, p_name text, p_email text, p_role text, p_club_id uuid default null
)
returns admins
language plpgsql security definer set search_path = public
as $$
declare
  v_row admins;
begin
  if not public.is_super_admin() then
    raise exception 'not authorized';
  end if;
  if p_role not in ('super_admin', 'professor', 'committee_member') then
    raise exception 'invalid role';
  end if;
  if p_role in ('professor', 'committee_member') and p_club_id is null then
    raise exception 'a professor or committee member must be scoped to a club';
  end if;
  if p_role = 'super_admin' and p_club_id is not null then
    raise exception 'a super admin is platform-wide and cannot be scoped to a club';
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
  if not public.is_super_admin() then
    raise exception 'not authorized';
  end if;
  if p_role not in ('super_admin', 'professor', 'committee_member') then
    raise exception 'invalid role';
  end if;
  if p_role in ('professor', 'committee_member') and p_club_id is null then
    raise exception 'a professor or committee member must be scoped to a club';
  end if;
  if p_role = 'super_admin' and p_club_id is not null then
    raise exception 'a super admin is platform-wide and cannot be scoped to a club';
  end if;

  update admins set role = p_role, club_id = p_club_id where id = p_admin_id;

  insert into audit_log_entries (admin_id, action, details)
  values (auth.uid(), 'role_change', jsonb_build_object('target_admin_id', p_admin_id, 'new_role', p_role, 'club_id', p_club_id));
end;
$$;

create or replace function public.admin_student_totals()
returns table (
  id uuid, name text, college_email text, phone text, status text,
  streak integer, season_joules integer, lifetime_joules integer, tier text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select
      s.id, s.name, s.college_email, s.phone, s.status,
      public.student_attendance_streak(s.id),
      public.student_season_joules(s.id),
      public.student_lifetime_joules(s.id),
      public.tier_for_joules(public.student_season_joules(s.id))
    from students s
    order by s.name;
end;
$$;

create or replace function public.trg_students_restrict_self_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_super_admin() or current_setting('jules.trusted_write', true) = 'on' then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.college_email is distinct from old.college_email then
    raise exception 'only name and phone are self-editable';
  end if;
  return new;
end;
$$;

-- ---------- platform-wide RLS policies: professor -> super_admin ----------
drop policy if exists "professor reads institution settings" on institution_settings;
drop policy if exists "professor updates institution settings" on institution_settings;
create policy "super admin reads institution settings" on institution_settings
  for select using (public.is_super_admin());
create policy "super admin updates institution settings" on institution_settings
  for update using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "professor manages seasons" on seasons;
create policy "super admin manages seasons" on seasons
  for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "professor manages clubs" on clubs;
create policy "super admin manages clubs" on clubs
  for all using (public.is_super_admin()) with check (public.is_super_admin());
-- "authenticated reads clubs" is unchanged — public club listing stays broad.

drop policy if exists "professor reads all students (vault)" on students;
drop policy if exists "professor updates any student" on students;
create policy "super admin reads all students (vault)" on students
  for select using (public.is_super_admin());
create policy "super admin updates any student" on students
  for update using (public.is_super_admin()) with check (public.is_super_admin());

-- The old broad "professor reads all students" policy powered the
-- registrations dashboard's student name/email/phone join for ANY event,
-- since professor used to mean platform-wide. Now that professor is
-- club-scoped, that join would silently come back empty for a club
-- Professor viewing their own club's real registrations — a real gap, not
-- covered by moving the old policy to super_admin alone. This narrower
-- policy grants exactly the legitimate need: a student's basic info is
-- readable by staff who can manage an event that student registered for.
create policy "staff reads registered students for own club events" on students
  for select using (
    public.is_super_admin() or exists (
      select 1 from event_registrations er
      where er.student_id = students.id and public.can_manage_event(er.event_id)
    )
  );

drop policy if exists "professor reads all admins" on admins;
create policy "super admin reads all admins" on admins
  for select using (public.is_super_admin());

drop policy if exists "professor reads audit log" on audit_log_entries;
create policy "super admin reads audit log" on audit_log_entries
  for select using (public.is_super_admin());

-- events delete: super_admin, or the owning club's professor — committee
-- member still cannot delete, matching the original intent (decision 46).
drop policy if exists "professor deletes events" on events;
create policy "super admin or owning professor deletes events" on events
  for delete using (
    public.is_super_admin() or (public.is_professor() and public.can_manage_club(club_id))
  );

-- ---------- was "any staff, platform-wide" -> now club-scoped ----------
drop policy if exists "committee member or professor reads full ledger" on joule_transactions;
create policy "staff reads own club ledger" on joule_transactions
  for select using (
    public.is_super_admin()
    or (event_id is not null and public.can_manage_event(event_id))
    or exists (
      select 1 from surges s where s.id = joule_transactions.surge_id and public.can_manage_surge(s.id)
    )
  );

drop policy if exists "committee member or professor reads all answers" on surge_answers;
create policy "staff reads own club surge answers" on surge_answers
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from questions q
      join surges s on s.id = q.surge_id
      where q.id = surge_answers.question_id and public.can_manage_surge(s.id)
    )
  );

drop policy if exists "committee member or professor reads all live answers" on live_round_answers;
create policy "staff reads own club live answers" on live_round_answers
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from live_rounds r join surges s on s.id = r.surge_id
      where r.id = live_round_answers.round_id and public.can_manage_surge(s.id)
    )
  );

-- event_reports had ZERO club scoping before this migration — any staff
-- could manage any club's reports. Traces its club via event_id -> events.
drop policy if exists "committee member or professor manages event reports" on event_reports;
create policy "staff manages own club event reports" on event_reports
  for all using (public.is_super_admin() or public.can_manage_event(event_id))
  with check (public.is_super_admin() or public.can_manage_event(event_id));
-- "anyone reads event reports" (0019) is unchanged — public report pages stay public.

drop policy if exists "committee member or professor reads all registrations" on event_registrations;
create policy "staff reads own club registrations" on event_registrations
  for select using (public.is_super_admin() or public.can_manage_event(event_id));
-- "student reads own registrations" is unchanged.

-- gallery_images has no club dimension today (a single shared platform
-- photo pool) — a nullable club_id is added so "club-scoped" means
-- something real: a Professor/Committee Member can only manage photos
-- tagged to their own club; untagged (club_id null) photos are Super-Admin
-- only, matching how a genuinely platform-wide album should be owned.
alter table gallery_images add column if not exists club_id uuid references clubs(id);

drop policy if exists "officer or owner manages gallery images" on gallery_images;
drop policy if exists "committee member or professor manages gallery images" on gallery_images;
create policy "staff manages own club gallery images" on gallery_images
  for all using (
    public.is_super_admin() or (club_id is not null and public.can_manage_club(club_id))
  )
  with check (
    public.is_super_admin() or (club_id is not null and public.can_manage_club(club_id))
  );
-- "anyone reads gallery images" is unchanged — the public Gallery page stays public.

-- Storage bucket writes stay "any staff" — the upload happens before the
-- gallery_images row (and its club_id) exists, so a per-club check isn't
-- possible at the bucket layer; real club scoping is enforced on the
-- gallery_images row itself above (the metadata a photo is actually
-- managed through).
drop policy if exists "committee member or professor writes gallery bucket" on storage.objects;
drop policy if exists "committee member or professor updates gallery bucket" on storage.objects;
drop policy if exists "committee member or professor deletes gallery bucket" on storage.objects;
create policy "staff writes gallery bucket" on storage.objects
  for insert with check (bucket_id = 'gallery' and (public.is_committee_member_or_professor() or public.is_super_admin()));
create policy "staff updates gallery bucket" on storage.objects
  for update using (bucket_id = 'gallery' and (public.is_committee_member_or_professor() or public.is_super_admin()))
  with check (bucket_id = 'gallery' and (public.is_committee_member_or_professor() or public.is_super_admin()));
create policy "staff deletes gallery bucket" on storage.objects
  for delete using (bucket_id = 'gallery' and (public.is_committee_member_or_professor() or public.is_super_admin()));

-- System Ledger: same "any staff" auth check, but the underlying query now
-- filters to the caller's own club unless they're super_admin.
create or replace function public.monthly_engagement()
returns table (month date, event_type text, total_joules integer, scan_count integer)
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
      date_trunc('month', jt.created_at)::date,
      e.type,
      sum(jt.amount)::integer,
      count(*)::integer
    from joule_transactions jt
    join events e on e.id = jt.event_id
    where jt.type = 'event_scan'
      and (public.is_super_admin() or e.club_id = v_club_id)
    group by 1, 2
    order by 1;
end;
$$;

create or replace function public.event_engagement_totals()
returns table (event_id uuid, total_attendees integer, total_joules integer)
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
    select jt.event_id, count(*)::integer, sum(jt.amount)::integer
    from joule_transactions jt
    join events e on e.id = jt.event_id
    where jt.type = 'event_scan'
      and (public.is_super_admin() or e.club_id = v_club_id)
    group by jt.event_id;
end;
$$;

-- ---------- QR scan window: one-sided, event start -> +20 minutes ----------
-- Replaces the old +/-15-minute window (0021). No signature change, so a
-- plain create or replace (no DROP FUNCTION needed).
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

  if now() not between v_event.event_date and (v_event.event_date + interval '20 minutes') then
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

-- current_qr_token: was display-only, no window check (the QR always
-- rendered even when it could never actually redeem). Now returns null
-- outside the same window redeem_event_scan enforces, so Grid Station can
-- show "opens at X" / "window closed" instead of a token doomed to fail.
create or replace function public.current_qr_token(p_event_id uuid)
returns table (token text, expires_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_epoch bigint := public.qr_epoch();
  v_event events;
begin
  if not public.can_manage_event(p_event_id) then
    raise exception 'not authorized';
  end if;
  select * into v_event from events where id = p_event_id;
  if v_event.id is null or now() not between v_event.event_date and (v_event.event_date + interval '20 minutes') then
    return;
  end if;
  return query select
    public.qr_token_for_epoch(p_event_id, v_epoch),
    to_timestamp((v_epoch + 1) * 90);
end;
$$;

-- migrate:down

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

  if now() not between (v_event.event_date - interval '15 minutes')
                    and (coalesce(v_event.end_date, v_event.event_date) + interval '15 minutes') then
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

drop policy if exists "staff writes gallery bucket" on storage.objects;
drop policy if exists "staff updates gallery bucket" on storage.objects;
drop policy if exists "staff deletes gallery bucket" on storage.objects;
create policy "committee member or professor writes gallery bucket" on storage.objects
  for insert with check (bucket_id = 'gallery' and public.is_committee_member_or_professor());
create policy "committee member or professor updates gallery bucket" on storage.objects
  for update using (bucket_id = 'gallery' and public.is_committee_member_or_professor())
  with check (bucket_id = 'gallery' and public.is_committee_member_or_professor());
create policy "committee member or professor deletes gallery bucket" on storage.objects
  for delete using (bucket_id = 'gallery' and public.is_committee_member_or_professor());

drop policy if exists "staff manages own club gallery images" on gallery_images;
create policy "committee member or professor manages gallery images" on gallery_images
  for all using (public.is_committee_member_or_professor()) with check (public.is_committee_member_or_professor());
alter table gallery_images drop column if exists club_id;

drop policy if exists "staff reads own club registrations" on event_registrations;
create policy "committee member or professor reads all registrations" on event_registrations
  for select using (public.is_committee_member_or_professor());

drop policy if exists "staff manages own club event reports" on event_reports;
create policy "committee member or professor manages event reports" on event_reports
  for all using (public.is_committee_member_or_professor()) with check (public.is_committee_member_or_professor());

drop policy if exists "staff reads own club live answers" on live_round_answers;
create policy "committee member or professor reads all live answers" on live_round_answers
  for select using (public.is_committee_member_or_professor());

drop policy if exists "staff reads own club surge answers" on surge_answers;
create policy "committee member or professor reads all answers" on surge_answers
  for select using (public.is_committee_member_or_professor());

drop policy if exists "staff reads own club ledger" on joule_transactions;
create policy "committee member or professor reads full ledger" on joule_transactions
  for select using (public.is_committee_member_or_professor());

drop policy if exists "super admin or owning professor deletes events" on events;
create policy "professor deletes events" on events
  for delete using (public.is_professor());

drop policy if exists "super admin reads audit log" on audit_log_entries;
create policy "professor reads audit log" on audit_log_entries
  for select using (public.is_professor());

drop policy if exists "super admin reads all admins" on admins;
create policy "professor reads all admins" on admins
  for select using (public.is_professor());

drop policy if exists "super admin reads all students (vault)" on students;
drop policy if exists "super admin updates any student" on students;
drop policy if exists "staff reads registered students for own club events" on students;
create policy "professor reads all students (vault)" on students
  for select using (public.is_professor());
create policy "professor updates any student" on students
  for update using (public.is_professor()) with check (public.is_professor());

drop policy if exists "super admin manages clubs" on clubs;
create policy "professor manages clubs" on clubs
  for all using (public.is_professor()) with check (public.is_professor());

drop policy if exists "super admin manages seasons" on seasons;
create policy "professor manages seasons" on seasons
  for all using (public.is_professor()) with check (public.is_professor());

drop policy if exists "super admin reads institution settings" on institution_settings;
drop policy if exists "super admin updates institution settings" on institution_settings;
create policy "professor reads institution settings" on institution_settings
  for select using (public.is_professor());
create policy "professor updates institution settings" on institution_settings
  for update using (public.is_professor()) with check (public.is_professor());

create or replace function public.trg_students_restrict_self_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_professor() or current_setting('jules.trusted_write', true) = 'on' then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.college_email is distinct from old.college_email then
    raise exception 'only name and phone are self-editable';
  end if;
  return new;
end;
$$;

create or replace function public.admin_student_totals()
returns table (
  id uuid, name text, college_email text, phone text, status text,
  streak integer, season_joules integer, lifetime_joules integer, tier text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_professor() then
    raise exception 'not authorized';
  end if;
  return query
    select
      s.id, s.name, s.college_email, s.phone, s.status,
      public.student_attendance_streak(s.id),
      public.student_season_joules(s.id),
      public.student_lifetime_joules(s.id),
      public.tier_for_joules(public.student_season_joules(s.id))
    from students s
    order by s.name;
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

create or replace function public.can_manage_club(p_club_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_professor() or exists (
    select 1 from admins a
    where a.id = auth.uid() and a.role = 'committee_member' and a.club_id = p_club_id
  );
$$;

drop function if exists public.is_super_admin();

alter table admins drop constraint if exists admins_club_scope_valid;
alter table admins drop constraint if exists admins_role_check;

update admins set role = 'professor' where role = 'super_admin';

alter table admins add constraint admins_role_check check (role in ('professor', 'committee_member'));
alter table admins add constraint admins_club_scope_valid check (
  (role = 'professor' and club_id is null) or
  (role = 'committee_member' and club_id is not null)
);
