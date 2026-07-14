-- 0026_public_events_detail_fields — the new public event detail page
-- (/events/[eventId]) needs end_date and joule_value to render, but events
-- only has an RLS policy for authenticated reads (0005), not anon — a raw
-- `.from('events').select(...)` from that page returns nothing for a
-- logged-out visitor and 404s. Same reason public_events() exists at all
-- (0014/0018): expose exactly the safe public fields through a security
-- definer RPC rather than opening RLS on the raw table.
--
-- Adding columns to a RETURNS TABLE is a return-type change CREATE OR
-- REPLACE won't allow (decisions 46-48) — explicit DROP first.

-- migrate:up

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

-- migrate:down

drop function if exists public.public_events();

create or replace function public.public_events()
returns table (id uuid, name text, type text, event_date timestamptz, location text, club_name text)
language sql stable security definer set search_path = public
as $$
  select e.id, e.name, e.type, e.event_date, e.location, c.name
  from events e
  left join clubs c on c.id = e.club_id
  where e.type <> 'surge'
  order by e.event_date desc;
$$;
grant execute on function public.public_events() to anon, authenticated;
