-- 0029_public_leaderboard — Phase C: a public Leaderboard page on the general
-- site, so non-students can see the same universal ranking Catalyst Records
-- already shows students (decision 48's season_leaderboard()). seasons and
-- season_leaderboard() are both authenticated-only (0005/0008), so this adds
-- narrow, security-definer public wrappers, matching the established
-- public_events()/public_clubs() pattern rather than opening RLS on the
-- underlying tables.

-- migrate:up

create or replace function public.public_seasons()
returns table (id uuid, label text, start_date date, end_date date)
language sql stable security definer set search_path = public
as $$
  select id, label, start_date, end_date from seasons order by start_date desc;
$$;
revoke all on function public.public_seasons() from public;
grant execute on function public.public_seasons() to anon, authenticated;

create or replace function public.public_season_leaderboard(
  p_season_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (student_id uuid, name text, total_amount integer, rank bigint, total_count bigint)
language sql stable security definer set search_path = public
as $$
  select student_id, name, total_amount, rank, count(*) over () as total_count
  from (
    select
      s.id as student_id,
      s.name,
      coalesce(sum(jt.amount), 0)::integer as total_amount,
      rank() over (order by coalesce(sum(jt.amount), 0) desc) as rank
    from students s
    join seasons se on se.id = p_season_id
    left join joule_transactions jt
      on jt.student_id = s.id
     and jt.created_at >= se.start_date
     and jt.created_at < (se.end_date + 1)
    group by s.id, s.name
  ) ranked
  order by rank
  limit p_limit offset p_offset;
$$;
revoke all on function public.public_season_leaderboard(uuid, integer, integer) from public;
grant execute on function public.public_season_leaderboard(uuid, integer, integer) to anon, authenticated;

-- migrate:down

drop function if exists public.public_season_leaderboard(uuid, integer, integer);
drop function if exists public.public_seasons();
