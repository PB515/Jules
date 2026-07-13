-- 0018_remove_avatar_system — undoes migration 0017 cleanly.
-- The 3D avatar/cosmetic-unlock system was built for the single-club
-- "Jules" version of this app; the professor-review pivot to a shared
-- multi-club platform (Synergy) dropped it entirely rather than carrying
-- it forward. A new forward migration, not a rollback of 0017 in place,
-- since 0017 is already applied to the live DB — this project's own
-- convention is to never edit/roll back an applied migration (decision 20's
-- lesson generalizes: undo forward, don't rewrite history).

-- migrate:up

drop function if exists public.avatar_items_catalog();
drop table if exists avatar_items;

-- migrate:down

create table avatar_items (
  id uuid primary key default gen_random_uuid(),
  slot text not null check (slot in ('hat', 'outfit', 'accessory', 'effect')),
  name text not null,
  joule_threshold integer not null default 0,
  color_hex text not null,
  created_at timestamptz not null default now()
);

alter table avatar_items enable row level security;

create or replace function public.avatar_items_catalog()
returns table (id uuid, slot text, name text, joule_threshold integer, color_hex text)
language sql stable security definer set search_path = public
as $$
  select a.id, a.slot, a.name, a.joule_threshold, a.color_hex
  from avatar_items a
  order by a.joule_threshold asc;
$$;
grant execute on function public.avatar_items_catalog() to anon, authenticated;
