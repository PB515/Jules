-- 0008_jules_season_leaderboard — backs Catalyst Records (spec §6): "the
-- active leaderboard" driven by Season Joules (spec §4), browsable by season.
-- Same privacy scoping as surge_leaderboard: name + total only, never email/phone.

-- migrate:up

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

-- migrate:down

drop function if exists public.season_leaderboard(uuid);
