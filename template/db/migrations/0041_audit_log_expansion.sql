-- 0041: expand the audit trail beyond force_reset/manual_joule_adjustment/
-- csv_import/role_change to cover everyday admin actions (event create/
-- edit, report create, gallery upload, Live Round hosting) — confirmed
-- with the user directly: individual accounts per real person (not one
-- shared login per club-role) only pays off if actions are actually
-- traceable to a specific account, and today they mostly aren't. There
-- was also, until now, no page anywhere in the app that even displays
-- audit_log_entries — pure write-only, invisible even to Super Admin.

-- migrate:up

alter table audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table audit_log_entries add constraint audit_log_entries_action_check
  check (action in (
    'force_reset', 'manual_joule_adjustment', 'csv_import', 'role_change',
    'event_create', 'event_edit', 'report_create', 'gallery_upload', 'live_round_create'
  ));

-- audit_log_entries has no INSERT RLS policy at all today, by design —
-- only SECURITY DEFINER RPCs (admin_adjust_joules etc.) could write to it.
-- This RPC follows the same golden-path discipline for the new call sites
-- (plain Server Actions using the RLS-scoped client) rather than opening a
-- raw insert policy.
create or replace function public.log_admin_action(
  p_action text,
  p_details jsonb default '{}'::jsonb,
  p_target_student_id uuid default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from admins where id = auth.uid()) then
    raise exception 'not authorized';
  end if;
  insert into audit_log_entries (admin_id, action, target_student_id, details)
  values (auth.uid(), p_action, p_target_student_id, p_details);
end;
$$;
revoke all on function public.log_admin_action(text, jsonb, uuid) from public;
grant execute on function public.log_admin_action(text, jsonb, uuid) to authenticated;

-- migrate:down

drop function if exists public.log_admin_action(text, jsonb, uuid);

alter table audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table audit_log_entries add constraint audit_log_entries_action_check
  check (action in ('force_reset', 'manual_joule_adjustment', 'csv_import', 'role_change'));
