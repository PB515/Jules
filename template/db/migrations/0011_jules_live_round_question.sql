-- 0011_jules_live_round_question — a team's own view of the current question.
-- Students have no SELECT policy on `questions` at all (0005) — correct_option
-- must never reach a client before it's been revealed to the room. This RPC is
-- the one read path for the Live Round team screen: it returns the current
-- question's text/options always, but correct_option ONLY once the round's
-- phase has moved past 'question' (i.e. the host has already revealed it to
-- the room) — same trust boundary the host's own screen already sits inside.

-- migrate:up

create or replace function public.live_round_question(p_round_id uuid)
returns table (
  id uuid, text text, option_a text, option_b text, option_c text, option_d text,
  time_limit_seconds integer, correct_option text, phase text, question_index integer
)
language plpgsql security definer set search_path = public
as $$
declare
  v_round live_rounds;
  v_team_exists boolean;
begin
  select * into v_round from live_rounds where id = p_round_id;
  if v_round.id is null then
    raise exception 'round not found';
  end if;

  select exists (
    select 1 from live_round_teams where round_id = p_round_id and student_id = auth.uid()
  ) into v_team_exists;
  if not v_team_exists then
    raise exception 'you have not joined this round';
  end if;

  return query
    select
      q.id, q.text, q.option_a, q.option_b, q.option_c, q.option_d, q.time_limit_seconds,
      case when v_round.phase in ('reveal', 'leaderboard', 'complete') then q.correct_option else null end,
      v_round.phase, v_round.question_index
    from questions q
    where q.surge_id = v_round.surge_id
    order by q.order_index
    offset v_round.question_index limit 1;
end;
$$;
revoke all on function public.live_round_question(uuid) from public;
grant execute on function public.live_round_question(uuid) to authenticated;

-- migrate:down

drop function if exists public.live_round_question(uuid);
