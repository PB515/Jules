-- 0048: Live Round finalization rearchitected from pooled/split per-answer
-- crediting to placement-based crediting, per the professor's explicit
-- request. The per-question mechanics (time-weighted correct-answer
-- formula via surge_answer_points(), negative marking) are UNCHANGED —
-- they're now used only to rank teams against each other, not as the
-- literal amount credited.
--
-- New crediting rule, confirmed with the user before writing this:
--   - Rank every team in the round by its pooled raw score (sum of
--     surge_answer_points() across all its members' answers).
--   - 1st place: 30 J total, split evenly across the team. 2nd: 25 J.
--     3rd: 20 J. No separate participation credit on top for these three
--     — the placement amount is their entire credit for the round.
--   - Every other team (4th place and below): a flat 10 J participation
--     credit, split evenly across the team, regardless of how many
--     questions they answered or got right.
--   - Splitting is a flat per-member division, rounded to the nearest
--     whole Joule (joule_transactions.amount is an integer column) — not
--     the old floor-plus-remainder-to-fastest-responder scheme, since
--     that scheme existed specifically to preserve an exact pooled total
--     that this model no longer needs to preserve.
--   - Async Surge Mode's complete_surge() is deliberately UNTOUCHED —
--     only Live Round is actually used in practice (decision 60), and
--     narrowing the blast radius of this change was an explicit choice
--     with the user.
--
-- complete_live_round(uuid)'s signature is unchanged (still returns
-- void), so a plain CREATE OR REPLACE is safe here — only the body
-- changes, not the function's declared shape.

-- migrate:up

create or replace function public.complete_live_round(p_round_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_round live_rounds;
  v_surge surges;
begin
  select * into v_round from live_rounds where id = p_round_id for update;
  if v_round.id is null then
    raise exception 'round not found';
  end if;
  if not public.can_manage_surge(v_round.surge_id) then
    raise exception 'not authorized';
  end if;

  select * into v_surge from surges where id = v_round.surge_id;

  with per_student_raw as (
    select
      a.student_id,
      sum(public.surge_answer_points(
        a.correct, v_surge.points_per_question, v_surge.negative_points_per_wrong_answer,
        a.response_time_ms, q.time_limit_seconds
      ))::integer as raw_earned
    from live_round_answers a
    join questions q on q.id = a.question_id
    where a.round_id = p_round_id
    group by a.student_id
  ),
  roster as (
    select m.student_id, m.team_id
    from live_round_team_members m
    where m.round_id = p_round_id
  ),
  team_totals as (
    select
      r.team_id,
      count(*)::integer as member_count,
      coalesce(sum(psr.raw_earned), 0)::integer as total_raw_earned
    from roster r
    left join per_student_raw psr on psr.student_id = r.student_id
    group by r.team_id
  ),
  ranked_teams as (
    select
      team_id,
      member_count,
      rank() over (order by total_raw_earned desc) as placement
    from team_totals
  ),
  team_pool as (
    select
      team_id,
      member_count,
      case
        when placement = 1 then 30
        when placement = 2 then 25
        when placement = 3 then 20
        else 10
      end as pool_amount,
      (placement <= 3) as is_winner
    from ranked_teams
  ),
  member_awards as (
    select
      r.student_id,
      tp.is_winner,
      round(tp.pool_amount::numeric / tp.member_count)::integer as award
    from roster r
    join team_pool tp on tp.team_id = r.team_id
  )
  insert into joule_transactions (student_id, surge_id, amount, type)
  select student_id, v_round.surge_id, award, case when is_winner then 'surge_earned' else 'surge_participation' end
  from member_awards
  where award <> 0;
end;
$$;
revoke all on function public.complete_live_round(uuid) from public;
grant execute on function public.complete_live_round(uuid) to authenticated;

-- migrate:down

create or replace function public.complete_live_round(p_round_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_round live_rounds;
  v_surge surges;
begin
  select * into v_round from live_rounds where id = p_round_id for update;
  if v_round.id is null then
    raise exception 'round not found';
  end if;
  if not public.can_manage_surge(v_round.surge_id) then
    raise exception 'not authorized';
  end if;

  select * into v_surge from surges where id = v_round.surge_id;

  with per_student_raw as (
    select
      a.student_id,
      count(*)::integer as questions_answered,
      sum(public.surge_answer_points(
        a.correct, v_surge.points_per_question, v_surge.negative_points_per_wrong_answer,
        a.response_time_ms, q.time_limit_seconds
      ))::integer as raw_earned,
      avg(a.response_time_ms) as avg_response_time_ms
    from live_round_answers a
    join questions q on q.id = a.question_id
    where a.round_id = p_round_id
    group by a.student_id
  ),
  roster as (
    select m.student_id, m.team_id as pool_key
    from live_round_team_members m
    where m.round_id = p_round_id
  ),
  roster_with_stats as (
    select
      r.student_id,
      r.pool_key,
      coalesce(psr.questions_answered, 0) as questions_answered,
      coalesce(psr.raw_earned, 0) as raw_earned,
      psr.avg_response_time_ms
    from roster r
    left join per_student_raw psr on psr.student_id = r.student_id
  ),
  group_totals as (
    select
      pool_key,
      count(*)::integer as member_count,
      (sum(questions_answered) * v_surge.participation_points_per_question)::integer as total_participation,
      sum(raw_earned)::integer as total_earned
    from roster_with_stats
    group by pool_key
  ),
  group_split as (
    select
      pool_key,
      floor(total_participation::numeric / member_count)::integer as participation_base,
      (total_participation - floor(total_participation::numeric / member_count)::integer * member_count)::integer as participation_remainder,
      floor(total_earned::numeric / member_count)::integer as earned_base,
      (total_earned - floor(total_earned::numeric / member_count)::integer * member_count)::integer as earned_remainder
    from group_totals
  ),
  ranked as (
    select
      rws.student_id,
      rws.pool_key,
      row_number() over (partition by rws.pool_key order by rws.avg_response_time_ms asc nulls last) as speed_rank
    from roster_with_stats rws
  ),
  awards as (
    select
      r.student_id,
      gs.participation_base + case when r.speed_rank <= gs.participation_remainder then 1 else 0 end as participation_award,
      gs.earned_base + case when r.speed_rank <= gs.earned_remainder then 1 else 0 end as earned_award
    from ranked r
    join group_split gs on gs.pool_key = r.pool_key
  )
  insert into joule_transactions (student_id, surge_id, amount, type)
  select student_id, v_round.surge_id, participation_award, 'surge_participation' from awards where participation_award <> 0
  union all
  select student_id, v_round.surge_id, earned_award, 'surge_earned' from awards where earned_award <> 0;
end;
$$;
revoke all on function public.complete_live_round(uuid) from public;
grant execute on function public.complete_live_round(uuid) to authenticated;
