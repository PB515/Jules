-- 0017_jules_avatar_items — catalog for the 3D avatar's cosmetic unlocks
-- (Goal 2 expansion: solarpunk avatar, decision 44). Static reference data,
-- same posture as public_events() (0014): no table policy at all, deny by
-- default, a single narrow RPC is the only read path — nothing to audit
-- for a leak later since the RPC's own column list is the whole surface.

-- migrate:up

create table avatar_items (
  id uuid primary key default gen_random_uuid(),
  slot text not null check (slot in ('hat', 'outfit', 'accessory', 'effect')),
  name text not null,
  joule_threshold integer not null default 0,
  color_hex text not null,
  created_at timestamptz not null default now()
);

alter table avatar_items enable row level security;
-- No policies — deny by default. avatar_items_catalog() below is the only path.

-- Whether an item is "unlocked" is derived client-side by comparing the
-- student's lifetime_joules (never resets, decision 5 — the right metric
-- for a permanent collection, unlike season_joules) against joule_threshold.
-- No per-student unlock-state table: same "computed, never stored"
-- philosophy already used for tiers (decision 11).
create or replace function public.avatar_items_catalog()
returns table (id uuid, slot text, name text, joule_threshold integer, color_hex text)
language sql stable security definer set search_path = public
as $$
  select a.id, a.slot, a.name, a.joule_threshold, a.color_hex
  from avatar_items a
  order by a.joule_threshold asc;
$$;
grant execute on function public.avatar_items_catalog() to anon, authenticated;

-- Colors deliberately diversified across the warm/organic family rather than
-- repeating gold four times (a real monotony finding from the design-system
-- pass: four items sharing one hex made every unlocked cosmetic render as
-- the same swatch). Two new companion hues carry this: amber-dust (#C98A3E,
-- "rare") and deep verdant-teal (#2E8B7A, "epic") — see globals.css.
insert into avatar_items (slot, name, joule_threshold, color_hex) values
  ('outfit', 'Sprout Wrap', 0, '#3ba26b'),
  ('hat', 'Ember Circlet', 150, '#d99a4e'),
  ('accessory', 'Volt Charm', 350, '#FFC72C'),
  ('outfit', 'Current Cloak', 600, '#C98A3E'),
  ('effect', 'Spark Aura', 800, '#2E8B7A'),
  ('hat', 'Plasma Crown', 1000, '#FFC72C'),
  ('accessory', 'Atom Orbit Ring', 1200, '#2E8B7A');

-- migrate:down

drop function if exists public.avatar_items_catalog();
drop table if exists avatar_items;
