-- 0035_live_round_leader_only_answers — real-device demo testing found that
-- with every team member able to answer independently on their own phone,
-- 4 teammates could all tap through the same question simultaneously, which
-- isn't the intended "one team, one shared answer" quiz experience. Confirmed
-- fix: only the team's captain (whoever created it, `live_round_teams.
-- created_by` — already tracked since decision 60's rearchitecture, no new
-- column needed) can submit an answer; other members watch read-only.
--
-- The pooled/split Joule crediting itself (decision 60) is untouched — it
-- already keys off `live_round_team_members`, and a team's roster is
-- unaffected by who is allowed to click. This only narrows who submit_live_
-- answer accepts a call from.

-- migrate:up

create or replace function public.submit_live_answer(
  p_round_id uuid,
  p_question_id uuid,
  p_selected_option text,
  p_response_time_ms integer default null
)
returns table (correct boolean, correct_option text, awarded integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_round live_rounds;
  v_team live_round_teams;
  v_question questions;
  v_surge surges;
  v_correct boolean;
  v_awarded integer;
begin
  select t.* into v_team
  from live_round_teams t
  join live_round_team_members m on m.team_id = t.id
  where m.round_id = p_round_id and m.student_id = auth.uid();
  if v_team.id is null then
    raise exception 'you have not joined this round';
  end if;
  if v_team.created_by <> auth.uid() then
    raise exception 'only your team captain can answer';
  end if;

  select * into v_round from live_rounds where id = p_round_id;
  if v_round.phase <> 'question' then
    raise exception 'this question is not open right now';
  end if;

  select * into v_question from questions
  where surge_id = v_round.surge_id and order_index = v_round.question_index;
  if v_question.id is null or v_question.id <> p_question_id then
    raise exception 'that is not the current question';
  end if;
  if p_selected_option not in ('A', 'B', 'C', 'D') then
    raise exception 'invalid option';
  end if;

  select * into v_surge from surges where id = v_round.surge_id;
  v_correct := (p_selected_option = v_question.correct_option);

  begin
    insert into live_round_answers (round_id, team_id, student_id, question_id, selected_option, correct, response_time_ms)
    values (p_round_id, v_team.id, auth.uid(), p_question_id, p_selected_option, v_correct, p_response_time_ms);
  exception when unique_violation then
    raise exception 'already answered';
  end;

  -- Preview only — the real ledger write is deferred to complete_live_round(),
  -- mirroring async Surge Mode (decision 49), since pooled team splitting
  -- can't happen until every member's answers for the round are known.
  v_awarded := public.surge_answer_points(
    v_correct, v_surge.points_per_question, v_surge.negative_points_per_wrong_answer,
    p_response_time_ms, v_question.time_limit_seconds
  );

  return query select v_correct, v_question.correct_option, v_awarded;
end;
$$;

-- migrate:down

create or replace function public.submit_live_answer(
  p_round_id uuid,
  p_question_id uuid,
  p_selected_option text,
  p_response_time_ms integer default null
)
returns table (correct boolean, correct_option text, awarded integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_round live_rounds;
  v_team_id uuid;
  v_question questions;
  v_surge surges;
  v_correct boolean;
  v_awarded integer;
begin
  select team_id into v_team_id from live_round_team_members
  where round_id = p_round_id and student_id = auth.uid();
  if v_team_id is null then
    raise exception 'you have not joined this round';
  end if;

  select * into v_round from live_rounds where id = p_round_id;
  if v_round.phase <> 'question' then
    raise exception 'this question is not open right now';
  end if;

  select * into v_question from questions
  where surge_id = v_round.surge_id and order_index = v_round.question_index;
  if v_question.id is null or v_question.id <> p_question_id then
    raise exception 'that is not the current question';
  end if;
  if p_selected_option not in ('A', 'B', 'C', 'D') then
    raise exception 'invalid option';
  end if;

  select * into v_surge from surges where id = v_round.surge_id;
  v_correct := (p_selected_option = v_question.correct_option);

  begin
    insert into live_round_answers (round_id, team_id, student_id, question_id, selected_option, correct, response_time_ms)
    values (p_round_id, v_team_id, auth.uid(), p_question_id, p_selected_option, v_correct, p_response_time_ms);
  exception when unique_violation then
    raise exception 'already answered';
  end;

  v_awarded := public.surge_answer_points(
    v_correct, v_surge.points_per_question, v_surge.negative_points_per_wrong_answer,
    p_response_time_ms, v_question.time_limit_seconds
  );

  return query select v_correct, v_question.correct_option, v_awarded;
end;
$$;
