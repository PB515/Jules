-- 0028_club_social_links_and_public_page — per-club public pages with
-- social links (feedback doc: "in footer... individual club pages and
-- their club social media links"). `clubs` only has an `authenticated`
-- read policy (0020) — same reasoning as public_events()/public_event_stats()
-- (0014/0018/0026): a public, logged-out-viewable club page needs a
-- security-definer RPC, not RLS opened on the raw table.

-- migrate:up

alter table clubs add column if not exists instagram_url text;
alter table clubs add column if not exists linkedin_url text;
alter table clubs add column if not exists x_url text;

create or replace function public.public_clubs()
returns table (
  id uuid, name text, slug text, description text,
  instagram_url text, linkedin_url text, x_url text
)
language sql stable security definer set search_path = public
as $$
  select id, name, slug, description, instagram_url, linkedin_url, x_url
  from clubs
  order by name;
$$;
grant execute on function public.public_clubs() to anon, authenticated;

-- migrate:down

drop function if exists public.public_clubs();

alter table clubs drop column if exists x_url;
alter table clubs drop column if exists linkedin_url;
alter table clubs drop column if exists instagram_url;
