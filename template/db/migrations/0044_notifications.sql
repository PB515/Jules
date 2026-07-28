-- 0044: in-app notification history — a real gap the user found testing
-- push on a real phone: once a push fires, nothing inside the app
-- remembers it. student_id is the fan-out key (one row per student per
-- notification, not one shared row) so each student has their own
-- read/unread state, matching how a real inbox needs to work.
--
-- Zero insert/update policies at all — writes are RPC-mediated
-- (mark_notification_read) or via the service-role client from
-- sendPushToStudents() (lib/jules/push.ts), the same trusted-server-context
-- posture as push_subscriptions. Reads use a plain, cheap direct SELECT
-- policy, same precedent as event_registrations' "student reads own rows"
-- (migration 0021) — reading your own notification history isn't a
-- sensitive write, no need to force it through an RPC.
--
-- Also widens audit_log_entries' action check constraint for the new
-- "Updates" admin tab (decision: staff can now send a manual event update,
-- not just the two automatic triggers) — bundled into this same migration
-- rather than a separate one, since it's a small, related addition.

-- migrate:up

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  title text not null,
  body text not null,
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_student on notifications (student_id, created_at desc);

alter table notifications enable row level security;

create policy "student reads own notifications" on notifications
  for select using (student_id = auth.uid());

create or replace function public.mark_notification_read(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update notifications set read_at = now() where id = p_id and student_id = auth.uid();
end;
$$;
revoke all on function public.mark_notification_read(uuid) from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;

alter table audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table audit_log_entries add constraint audit_log_entries_action_check
  check (action in (
    'force_reset', 'manual_joule_adjustment', 'csv_import', 'role_change',
    'event_create', 'event_edit', 'report_create', 'gallery_upload', 'live_round_create',
    'event_update_sent'
  ));

-- migrate:down

alter table audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table audit_log_entries add constraint audit_log_entries_action_check
  check (action in (
    'force_reset', 'manual_joule_adjustment', 'csv_import', 'role_change',
    'event_create', 'event_edit', 'report_create', 'gallery_upload', 'live_round_create'
  ));

drop function if exists public.mark_notification_read(uuid);
drop table if exists notifications;
