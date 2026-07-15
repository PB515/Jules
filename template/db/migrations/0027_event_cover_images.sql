-- 0027_event_cover_images — lets a club attach a cover/poster image to an
-- event, displayed on the public events card grid and the event detail
-- page. Same Storage bucket pattern already proven for `gallery` (0014):
-- a public-read bucket, writes restricted to committee_member/professor.

-- migrate:up

alter table events add column if not exists cover_image_path text;

-- public_events() adds cover_image_path — return-type change, DROP first
-- (decisions 46-48's standing rule).
drop function if exists public.public_events();

create or replace function public.public_events()
returns table (
  id uuid, name text, type text, event_date timestamptz, end_date timestamptz,
  location text, joule_value integer, club_name text, cover_image_path text
)
language sql stable security definer set search_path = public
as $$
  select e.id, e.name, e.type, e.event_date, e.end_date, e.location, e.joule_value, c.name, e.cover_image_path
  from events e
  left join clubs c on c.id = e.club_id
  where e.type <> 'surge'
  order by e.event_date desc;
$$;
grant execute on function public.public_events() to anon, authenticated;

-- ---------- Storage: the `event-covers` bucket ----------
insert into storage.buckets (id, name, public)
values ('event-covers', 'event-covers', true)
on conflict (id) do nothing;

create policy "anyone reads event-covers bucket" on storage.objects
  for select using (bucket_id = 'event-covers');
create policy "committee member or professor writes event-covers bucket" on storage.objects
  for insert with check (bucket_id = 'event-covers' and public.is_committee_member_or_professor());
create policy "committee member or professor updates event-covers bucket" on storage.objects
  for update using (bucket_id = 'event-covers' and public.is_committee_member_or_professor())
  with check (bucket_id = 'event-covers' and public.is_committee_member_or_professor());
create policy "committee member or professor deletes event-covers bucket" on storage.objects
  for delete using (bucket_id = 'event-covers' and public.is_committee_member_or_professor());

-- migrate:down

drop policy if exists "committee member or professor deletes event-covers bucket" on storage.objects;
drop policy if exists "committee member or professor updates event-covers bucket" on storage.objects;
drop policy if exists "committee member or professor writes event-covers bucket" on storage.objects;
drop policy if exists "anyone reads event-covers bucket" on storage.objects;
delete from storage.buckets where id = 'event-covers';

drop function if exists public.public_events();

create or replace function public.public_events()
returns table (
  id uuid, name text, type text, event_date timestamptz, end_date timestamptz,
  location text, joule_value integer, club_name text
)
language sql stable security definer set search_path = public
as $$
  select e.id, e.name, e.type, e.event_date, e.end_date, e.location, e.joule_value, c.name
  from events e
  left join clubs c on c.id = e.club_id
  where e.type <> 'surge'
  order by e.event_date desc;
$$;
grant execute on function public.public_events() to anon, authenticated;

alter table events drop column if exists cover_image_path;
