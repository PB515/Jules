-- 0022_pivot_phase3_universal_leaderboard — Pivot Phase 3 (CLAUDE.md decision
-- 45/48): "all student will get a rank even if there are 400 then all 400
-- will be on points and there will be leader board" — a real behavior
-- change, not just a naming one.
--
-- `season_leaderboard()` (0008) already had no top-N cutoff — it was never
-- capped at 10 — but it silently excluded any student with zero Joules for
-- the season (`having coalesce(sum(jt.amount), 0) > 0`), which is exactly
-- the case the professor called out: a student with 0 points still needs a
-- rank. Fixed in place rather than adding a redundant parallel RPC, since
-- Joules were never club-scoped (decision 46's "points stay universal
-- ledger") — this function already IS the platform-wide leaderboard the
-- plan describes, it just had a filtering bug.
--
-- Also adds real pagination (`p_limit`/`p_offset`) so a 400-student roster
-- doesn't have to render in one unbounded list — `total_count` rides along
-- via `count(*) over ()`, computed before LIMIT/OFFSET apply in SQL's
-- logical processing order, so it always reflects the true total regardless
-- of which page is requested.

-- migrate:up

-- Adding parameters changes the function's identity for Postgres's own
-- overload resolution (same lesson as decisions 46/47) — CREATE OR REPLACE
-- would just create a second, separately-callable overload alongside the
-- old zero-argument-count-mismatched one instead of truly replacing it.
-- An explicit DROP avoids that confusion.
drop function if exists public.season_leaderboard(uuid);

create or replace function public.season_leaderboard(
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
revoke all on function public.season_leaderboard(uuid, integer, integer) from public;
grant execute on function public.season_leaderboard(uuid, integer, integer) to authenticated;

-- migrate:down

drop function if exists public.season_leaderboard(uuid, integer, integer);

create or replace function public.season_leaderboard(p_season_id uuid)
returns table (student_id uuid, name text, total_amount integer, rank bigint)
language sql stable security definer set search_path = public
as $$
  select
    s.id,
    s.name,
    coalesce(sum(jt.amount), 0)::integer as total_amount,
    rank() over (order by coalesce(sum(jt.amount), 0) desc)
  from students s
  join seasons se on se.id = p_season_id
  left join joule_transactions jt
    on jt.student_id = s.id
   and jt.created_at >= se.start_date
   and jt.created_at < (se.end_date + 1)
  group by s.id, s.name
  having coalesce(sum(jt.amount), 0) > 0
  order by total_amount desc;
$$;
revoke all on function public.season_leaderboard(uuid) from public;
grant execute on function public.season_leaderboard(uuid) to authenticated;
