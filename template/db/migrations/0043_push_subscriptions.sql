-- 0043: Web Push subscription storage for the two notification types
-- confirmed with the user — Type 1 "new event declared" (broadcast to
-- every student) and Type 2 "event info" (venue/date changes, gated
-- strictly to event_registrations — nobody who hasn't registered for that
-- event gets anything). Resend (a separate, forgot-password-only piece,
-- config-only, no migration needed) explicitly does NOT touch this path —
-- a free Resend plan can't absorb broadcast volume, so all event
-- notifications go through Web Push instead.
--
-- Zero RLS policies on this table, deliberately — matching this project's
-- strictest existing tables (e.g. joule_transactions writes). A student's
-- own subscribe/unsubscribe goes through the two SECURITY DEFINER RPCs
-- below; reads for actually sending a push happen via the service-role
-- client from trusted Server Action contexts only (the same posture
-- bulkCreateStudentsAction already uses for its own service-role reads).

-- migrate:up

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create or replace function public.subscribe_push(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from students where id = auth.uid()) then
    raise exception 'not a student';
  end if;

  insert into push_subscriptions (student_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set student_id = excluded.student_id, p256dh = excluded.p256dh, auth = excluded.auth;
end;
$$;
revoke all on function public.subscribe_push(text, text, text) from public;
grant execute on function public.subscribe_push(text, text, text) to authenticated;

create or replace function public.unsubscribe_push(p_endpoint text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from push_subscriptions where endpoint = p_endpoint and student_id = auth.uid();
end;
$$;
revoke all on function public.unsubscribe_push(text) from public;
grant execute on function public.unsubscribe_push(text) to authenticated;

-- migrate:down

drop function if exists public.unsubscribe_push(text);
drop function if exists public.subscribe_push(text, text, text);
drop table if exists push_subscriptions;
