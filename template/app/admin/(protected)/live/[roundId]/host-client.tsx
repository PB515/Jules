'use client';
/**
 * The Live Round host screen — one device is both the controller and the
 * projector display (v1 scope, confirmed with the user). Subscribes to
 * Supabase Realtime so join counts, answer counts, and phase changes render
 * instantly without polling — this is the "live" in Live Round.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Crown, Check, Loader2 } from '@/lib/icons';
import type { Database, LivePhase } from '@/lib/supabase/database.types';

type Round = Database['public']['Tables']['live_rounds']['Row'];
type Question = {
  id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  time_limit_seconds: number;
};
type ScoreRow = Database['public']['Functions']['live_round_scoreboard']['Returns'][number];
type Option = 'A' | 'B' | 'C' | 'D';

export function HostClient({
  initialRound,
  surgeName,
  pointsPerQuestion,
  questions,
}: {
  initialRound: Round;
  surgeName: string;
  pointsPerQuestion: number;
  questions: Question[];
}) {
  const [round, setRound] = useState(initialRound);
  const [teamCount, setTeamCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [scoreboard, setScoreboard] = useState<ScoreRow[]>([]);
  const [advancing, setAdvancing] = useState(false);
  const supabase = useRef(createClient()).current;

  const refreshScoreboard = useCallback(async () => {
    const { data } = await supabase.rpc('live_round_scoreboard', { p_round_id: initialRound.id });
    setScoreboard(data ?? []);
  }, [supabase, initialRound.id]);

  const refreshTeamCount = useCallback(async () => {
    const { count } = await supabase
      .from('live_round_teams')
      .select('id', { count: 'exact', head: true })
      .eq('round_id', initialRound.id);
    setTeamCount(count ?? 0);
  }, [supabase, initialRound.id]);

  useEffect(() => {
    refreshTeamCount();
    refreshScoreboard();

    const channel = supabase
      .channel(`live_round:${initialRound.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_rounds', filter: `id=eq.${initialRound.id}` },
        (payload) => {
          setRound(payload.new as Round);
          setAnsweredCount(0);
          refreshScoreboard();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_round_teams', filter: `round_id=eq.${initialRound.id}` },
        () => setTeamCount((c) => c + 1)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_round_answers', filter: `round_id=eq.${initialRound.id}` },
        () => setAnsweredCount((c) => c + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRound.id]);

  const advance = useCallback(async () => {
    setAdvancing(true);
    const { data, error } = await supabase.rpc('host_advance_round', { p_round_id: initialRound.id });
    if (!error && data) {
      setRound(data as Round);
      setAnsweredCount(0);
    }
    setAdvancing(false);
  }, [supabase, initialRound.id]);

  const q = questions[round.question_index];
  const isLast = round.question_index + 1 >= questions.length;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="text-xs uppercase tracking-[0.2em] text-tertiary">{surgeName} · Live Round</div>

      {round.phase === 'lobby' ? <LobbyView roomCode={round.room_code} teamCount={teamCount} /> : null}

      {round.phase === 'question' && q ? (
        <QuestionView
          q={q}
          index={round.question_index}
          total={questions.length}
          startedAt={round.question_started_at}
          answeredCount={answeredCount}
          teamCount={teamCount}
        />
      ) : null}

      {(round.phase === 'reveal' || round.phase === 'leaderboard') && q ? (
        <RevealView q={q} points={pointsPerQuestion} phase={round.phase} scoreboard={scoreboard} />
      ) : null}

      {round.phase === 'complete' ? <FinalView scoreboard={scoreboard} /> : null}

      {round.phase !== 'complete' ? (
        <button
          onClick={advance}
          disabled={advancing || (round.phase === 'lobby' && teamCount === 0)}
          className="flex items-center gap-2 rounded-[var(--radius)] bg-gold px-8 py-3 text-sm font-medium text-gold-foreground disabled:opacity-50"
        >
          {advancing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {round.phase === 'lobby'
            ? 'Start round'
            : round.phase === 'question'
              ? 'Reveal answer'
              : round.phase === 'reveal'
                ? 'Show scoreboard'
                : isLast
                  ? 'Finish round'
                  : 'Next question'}
        </button>
      ) : null}
    </div>
  );
}

function LobbyView({ roomCode, teamCount }: { roomCode: string; teamCount: number }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted">Teams join at /live with this code</p>
      <div className="rounded-2xl border-2 border-gold bg-card px-12 py-8 text-6xl font-medium tracking-[0.3em] text-gold">
        {roomCode}
      </div>
      <p className="text-lg text-foreground">
        {teamCount} team{teamCount === 1 ? '' : 's'} joined
      </p>
    </div>
  );
}

function QuestionView({
  q,
  index,
  total,
  startedAt,
  answeredCount,
  teamCount,
}: {
  q: Question;
  index: number;
  total: number;
  startedAt: string | null;
  answeredCount: number;
  teamCount: number;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(id);
  }, [startedAt]);

  const remaining = Math.max(0, q.time_limit_seconds - elapsed);
  const options: [Option, string][] = [
    ['A', q.option_a],
    ['B', q.option_b],
    ['C', q.option_c],
    ['D', q.option_d],
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      <p className="text-sm text-tertiary">
        Question {index + 1} / {total} · {remaining}s left
      </p>
      <h1 className="text-3xl leading-snug font-medium">{q.text}</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map(([key, label]) => (
          <div key={key} className="rounded-[var(--radius)] border border-border bg-card px-4 py-3.5 text-left text-lg">
            <span className="mr-2 text-tertiary">{key}.</span>
            {label}
          </div>
        ))}
      </div>
      <p className="text-lg text-gold">
        {answeredCount} / {teamCount} teams answered
      </p>
    </div>
  );
}

function RevealView({
  q,
  points,
  phase,
  scoreboard,
}: {
  q: Question;
  points: number;
  phase: LivePhase;
  scoreboard: ScoreRow[];
}) {
  const options: [Option, string][] = [
    ['A', q.option_a],
    ['B', q.option_b],
    ['C', q.option_c],
    ['D', q.option_d],
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      {phase === 'reveal' ? (
        <>
          <h1 className="text-2xl font-medium">{q.text}</h1>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {options.map(([key, label]) => {
              const isCorrect = key === q.correct_option;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-[var(--radius)] border px-4 py-3.5 text-left text-lg"
                  style={
                    isCorrect
                      ? { borderColor: 'var(--gold)', background: 'var(--tier-volt-bg)' }
                      : { borderColor: 'var(--border)', background: 'var(--card)' }
                  }
                >
                  <span>
                    <span className="mr-2 text-tertiary">{key}.</span>
                    {label}
                  </span>
                  {isCorrect ? <Check className="size-5 text-gold" aria-hidden /> : null}
                </div>
              );
            })}
          </div>
          <p className="text-sm text-tertiary">Correct answers earn +{points} J</p>
        </>
      ) : (
        <Scoreboard rows={scoreboard} />
      )}
    </div>
  );
}

function FinalView({ scoreboard }: { scoreboard: ScoreRow[] }) {
  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-2xl font-medium">Final standings</h1>
      <Scoreboard rows={scoreboard} />
    </div>
  );
}

function Scoreboard({ rows }: { rows: ScoreRow[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li
          key={r.team_id}
          className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-card px-4 py-3"
        >
          <span className="flex items-center gap-2 text-lg">
            {r.rank === 1 ? <Crown className="size-5 text-gold" aria-hidden /> : <span className="w-5 text-tertiary">{r.rank}</span>}
            {r.team_name}
          </span>
          <span className="text-lg text-gold">{r.total_amount} J</span>
        </li>
      ))}
    </ul>
  );
}
