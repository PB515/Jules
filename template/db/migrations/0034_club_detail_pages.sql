-- 0034_club_detail_pages — real per-club content on the public club detail
-- page (docs/club-detail-pages-spec.md), sourced from the actual "SOP for
-- Students Conduits" document. The existing `description` column is reused
-- as the card-trio's "Focus" copy rather than adding a redundant column —
-- confirmed against current usage: `description` already holds a one-
-- sentence activity summary (shown on /clubs' grid cards and the club
-- detail page header), which is exactly what "Focus" is. The universal
-- rules FAQ (identical on every club's page) is NOT stored here — it's a
-- hardcoded constant in the page component, same pattern as this codebase's
-- other static label maps (TYPE_LABEL, NAV).

-- migrate:up

alter table clubs add column if not exists mentor_name text;
alter table clubs add column if not exists gain text[] not null default '{}';
alter table clubs add column if not exists activities text[] not null default '{}';

-- CREATE OR REPLACE can't change a function's return-column shape (a
-- standing rule in this project since decisions 46-48) — drop first.
drop function if exists public.public_clubs();

create function public.public_clubs()
returns table (
  id uuid, name text, slug text, description text,
  instagram_url text, linkedin_url text, x_url text,
  mentor_name text, gain text[], activities text[]
)
language sql stable security definer set search_path = public
as $$
  select id, name, slug, description, instagram_url, linkedin_url, x_url,
         mentor_name, gain, activities
  from clubs
  order by name;
$$;
grant execute on function public.public_clubs() to anon, authenticated;

-- migrate:down

drop function if exists public.public_clubs();

create function public.public_clubs()
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

alter table clubs drop column if exists activities;
alter table clubs drop column if exists gain;
alter table clubs drop column if exists mentor_name;
