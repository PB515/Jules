-- 0005_jules_rls — enable RLS on every Jules table, deny by default, allow on
-- purpose. Ledger tables (joule_transactions, audit_log_entries) and the
-- admins roster get ZERO direct write policies — all writes go through the
-- SECURITY DEFINER RPCs in 0006_jules_rpcs.sql, so every sensitive mutation is
-- validated and (where required) audit-logged in one atomic place, never
-- bypassable via a raw `.from(table).insert()` call from the client.

-- migrate:up

alter table institution_settings enable row level security;
alter table students enable row level security;
alter table admins enable row level security;
alter table seasons enable row level security;
alter table events enable row level security;
alter table surges enable row level security;
alter table questions enable row level security;
alter table joule_transactions enable row level security;
alter table surge_answers enable row level security;
alter table audit_log_entries enable row level security;

-- ---------- institution_settings ----------
create policy "owner reads institution settings" on institution_settings
  for select using (public.is_owner());
create policy "owner updates institution settings" on institution_settings
  for update using (public.is_owner()) with check (public.is_owner());

-- ---------- students ----------
create policy "student reads own row" on students
  for select using (id = auth.uid());
create policy "owner reads all students (vault)" on students
  for select using (public.is_owner());
-- No INSERT policy: onboarding only completes via complete_onboarding() (0006).
create policy "student updates own row" on students
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "owner updates any student" on students
  for update using (public.is_owner()) with check (public.is_owner());

-- Column-level guard: the two UPDATE policies above both apply to the shared
-- `authenticated` Postgres role, so RLS alone can't stop a student from
-- writing to status/streak_days/etc. through their own-row policy. This
-- trigger closes that gap: non-owners may only ever change name/phone.
create or replace function public.trg_students_restrict_self_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_owner() then
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
drop trigger if exists students_restrict_self_update on students;
create trigger students_restrict_self_update
  before update on students
  for each row execute function public.trg_students_restrict_self_update();

-- ---------- admins ----------
create policy "admin reads own row" on admins
  for select using (id = auth.uid());
create policy "owner reads all admins" on admins
  for select using (public.is_owner());
-- No insert/update/delete policies: roster changes only via admin_set_role() /
-- admin_create_admin() (0006), which are owner-gated AND audit-logged together.

-- ---------- seasons ----------
create policy "authenticated reads seasons" on seasons
  for select using (auth.uid() is not null);
create policy "owner manages seasons" on seasons
  for all using (public.is_owner()) with check (public.is_owner());

-- ---------- events ----------
create policy "authenticated reads events" on events
  for select using (auth.uid() is not null);
create policy "officer or owner creates/edits events" on events
  for insert with check (public.is_officer_or_owner());
create policy "officer or owner updates events" on events
  for update using (public.is_officer_or_owner()) with check (public.is_officer_or_owner());
create policy "owner deletes events" on events
  for delete using (public.is_owner());

-- ---------- surges ----------
create policy "authenticated reads surges" on surges
  for select using (auth.uid() is not null);
create policy "officer or owner manages surges" on surges
  for all using (public.is_officer_or_owner()) with check (public.is_officer_or_owner());

-- ---------- questions ----------
-- Deliberately NO select policy for plain students — correct_option must never
-- reach a client mid-Surge. Students only ever see questions via start_surge()
-- (0006), which strips correct_option before returning.
create policy "officer or owner manages questions" on questions
  for all using (public.is_officer_or_owner()) with check (public.is_officer_or_owner());

-- ---------- joule_transactions (ledger — append-only, RPC-only writes) ----------
create policy "student reads own ledger" on joule_transactions
  for select using (student_id = auth.uid());
create policy "officer or owner reads full ledger" on joule_transactions
  for select using (public.is_officer_or_owner());
-- No insert/update/delete policies at all: redeem_event_scan(), submit_surge_answer(),
-- and admin_adjust_joules() (0006) are the only paths in. The ledger cannot be
-- edited or deleted through the API even by the Owner — that's the audit guarantee.

-- ---------- surge_answers (rate-limit record, RPC-only writes) ----------
create policy "student reads own answers" on surge_answers
  for select using (student_id = auth.uid());
create policy "officer or owner reads all answers" on surge_answers
  for select using (public.is_officer_or_owner());
-- No write policies: submit_surge_answer() (0006) is the only writer.

-- ---------- audit_log_entries ----------
create policy "owner reads audit log" on audit_log_entries
  for select using (public.is_owner());
-- No write policies: entries are inserted only by the SECURITY DEFINER RPCs
-- (0006) or the Force Reset server action (service-role, bypasses RLS by design).

-- migrate:down

drop policy if exists "owner reads audit log" on audit_log_entries;
drop policy if exists "officer or owner reads all answers" on surge_answers;
drop policy if exists "student reads own answers" on surge_answers;
drop policy if exists "officer or owner reads full ledger" on joule_transactions;
drop policy if exists "student reads own ledger" on joule_transactions;
drop policy if exists "officer or owner manages questions" on questions;
drop policy if exists "officer or owner manages surges" on surges;
drop policy if exists "authenticated reads surges" on surges;
drop policy if exists "owner deletes events" on events;
drop policy if exists "officer or owner updates events" on events;
drop policy if exists "officer or owner creates/edits events" on events;
drop policy if exists "authenticated reads events" on events;
drop policy if exists "owner manages seasons" on seasons;
drop policy if exists "authenticated reads seasons" on seasons;
drop policy if exists "owner reads all admins" on admins;
drop policy if exists "admin reads own row" on admins;
drop trigger if exists students_restrict_self_update on students;
drop function if exists public.trg_students_restrict_self_update();
drop policy if exists "owner updates any student" on students;
drop policy if exists "student updates own row" on students;
drop policy if exists "owner reads all students (vault)" on students;
drop policy if exists "student reads own row" on students;
drop policy if exists "owner updates institution settings" on institution_settings;
drop policy if exists "owner reads institution settings" on institution_settings;

alter table audit_log_entries disable row level security;
alter table surge_answers disable row level security;
alter table joule_transactions disable row level security;
alter table questions disable row level security;
alter table surges disable row level security;
alter table events disable row level security;
alter table seasons disable row level security;
alter table admins disable row level security;
alter table students disable row level security;
alter table institution_settings disable row level security;
