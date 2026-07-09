-- 0014_jules_general_site — data for the new public "General" site: a public
-- event calendar (via a narrow RPC, never a direct policy on `events`), plus
-- Afterglow (written event recaps, linked to a real event so the numbers in
-- the writing are real) and Gallery (uploaded photos). Public content is
-- public by design here — the deny-by-default posture still applies to
-- WRITES (officer/owner only), just not reads.

-- migrate:up

-- ---------- public event calendar (RPC, not a table policy) ----------
-- Never exposes qr_code/geofence columns — narrower than the `events` row
-- itself, so there's nothing to audit for a leak later; the RPC's own
-- column list IS the safety boundary.
create or replace function public.public_events()
returns table (id uuid, name text, type text, event_date timestamptz, location text)
language sql stable security definer set search_path = public
as $$
  select e.id, e.name, e.type, e.event_date, e.location
  from events e
  where e.type <> 'surge' -- Surges aren't public check-in events
  order by e.event_date desc;
$$;
grant execute on function public.public_events() to anon, authenticated;

-- A single event's real engagement numbers, for the Afterglow post that
-- recaps it — public (attendance counts aren't sensitive), narrower than
-- event_engagement_totals() (0009, officer/owner, all events at once).
create or replace function public.public_event_stats(p_event_id uuid)
returns table (total_attendees integer, total_joules integer)
language sql stable security definer set search_path = public
as $$
  select count(distinct student_id)::integer, coalesce(sum(amount), 0)::integer
  from joule_transactions
  where event_id = p_event_id and type = 'event_scan';
$$;
grant execute on function public.public_event_stats(uuid) to anon, authenticated;

-- ---------- Afterglow (written recaps) ----------
create table afterglow_posts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 160),
  body        text not null check (char_length(body) between 1 and 20000),
  event_id    uuid not null references events(id),
  uploaded_by uuid references admins(id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_afterglow_created on afterglow_posts (created_at desc);

alter table afterglow_posts enable row level security;
create policy "anyone reads afterglow posts" on afterglow_posts
  for select using (true);
create policy "officer or owner manages afterglow posts" on afterglow_posts
  for all using (public.is_officer_or_owner()) with check (public.is_officer_or_owner());

-- ---------- Gallery ----------
create table gallery_images (
  id          uuid primary key default gen_random_uuid(),
  caption     text,
  file_path   text not null,
  uploaded_by uuid references admins(id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_gallery_created on gallery_images (created_at desc);

alter table gallery_images enable row level security;
create policy "anyone reads gallery images" on gallery_images
  for select using (true);
create policy "officer or owner manages gallery images" on gallery_images
  for all using (public.is_officer_or_owner()) with check (public.is_officer_or_owner());

-- ---------- Storage: the `gallery` bucket ----------
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

create policy "anyone reads gallery bucket" on storage.objects
  for select using (bucket_id = 'gallery');
create policy "officer or owner writes gallery bucket" on storage.objects
  for insert with check (bucket_id = 'gallery' and public.is_officer_or_owner());
create policy "officer or owner updates gallery bucket" on storage.objects
  for update using (bucket_id = 'gallery' and public.is_officer_or_owner())
  with check (bucket_id = 'gallery' and public.is_officer_or_owner());
create policy "officer or owner deletes gallery bucket" on storage.objects
  for delete using (bucket_id = 'gallery' and public.is_officer_or_owner());

-- migrate:down

drop policy if exists "officer or owner deletes gallery bucket" on storage.objects;
drop policy if exists "officer or owner updates gallery bucket" on storage.objects;
drop policy if exists "officer or owner writes gallery bucket" on storage.objects;
drop policy if exists "anyone reads gallery bucket" on storage.objects;
delete from storage.buckets where id = 'gallery';

drop policy if exists "officer or owner manages gallery images" on gallery_images;
drop policy if exists "anyone reads gallery images" on gallery_images;
drop table if exists gallery_images;

drop policy if exists "officer or owner manages afterglow posts" on afterglow_posts;
drop policy if exists "anyone reads afterglow posts" on afterglow_posts;
drop table if exists afterglow_posts;

drop function if exists public.public_event_stats(uuid);
drop function if exists public.public_events();
