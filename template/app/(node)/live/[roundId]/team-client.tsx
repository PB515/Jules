'use client';
/**
 * Live Round — team play screen. Waits in the lobby, answers one question at
 * a time in lockstep with the host's projector, shows instant personal
 * feedback, then the shared scoreboard once the host reveals it. Realtime
 * (not polling) drives every phase change.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { EnergyBar } from '@/lib/components/energy-bar';
import { RevealScoreboard } from '@/lib/components/reveal-scoreboard';
import { playSound } from '@/lib/jules/sound';
import { vibrate } from '@/lib/jules/haptics';
import { Check, X, Crown } from '@/lib/icons';
import type { Database } from '@/lib/supabase/database.types';

type Round = Database['public']['Tables']['live_rounds']['Row'];
type LiveQuestion = Database['public']['Functions']['live_round_question']['Returns'][number];
type ScoreRow = Database['public']['Functions']['live_round_scoreboard']['Returns'][number];
type Option = 'A' | 'B' | 'C' | 'D';

export function TeamClient({
  roundId,
  initialRound,
  teamName,
  pointsPerQuestion,
  totalQuestions,
}: {
  roundId: string;
  initialRound: Round;
  teamName: string;
  pointsPerQuestion: number;
  totalQuestions: number;
}) {
  const [round, setRound] = useState(initialRound);
  const [question, setQuestion] = useState<LiveQuestion | null>(null);
  const [selected, setSelected] = useState<Option | null>(null);
  const [awarded, setAwarded] = useState<number | null>(null);
  const [scoreboard, setScoreboard] = useState<ScoreRow[]>([]);
  const supabase = useRef(createClient()).current;
  const isLastQuestion = round.question_index + 1 >= totalQuestions;

  const loadQuestion = useCallback(async () => {
    const { data } = await supabase.rpc('live_round_question', { p_round_id: roundId });
    setQuestion(data?.[0] ?? null);
  }, [supabase, roundId]);

  const loadScoreboard = useCallback(async () => {
    const { data } = await supabase.rpc('live_round_scoreboard', { p_round_id: roundId });
    setScoreboard(data ?? []);
  }, [supabase, roundId]);

  useEffect(() => {
    loadQuestion();
    // Cold-load case: arriving directly at reveal/leaderboard/complete (a
    // reload, or joining late) — the realtime handler below only fires on a
    // *change*, so the initial render needs its own fetch too.
    if (round.phase === 'reveal' || round.phase === 'leaderboard' || round.phase === 'complete') {
      loadScoreboard();
    }

    const channel = supabase
      .channel(`live_round_team:${roundId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_rounds', filter: `id=eq.${roundId}` },
        (payload) => {
          const next = payload.new as Round;
          setRound(next);
          setSelected(null);
          setAwarded(null);
          loadQuestion();
          if (next.phase === 'reveal' || next.phase === 'leaderboard' || next.phase === 'complete') {
            loadScoreboard();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  const choose = useCallback(
    async (opt: Option) => {
      if (!question || selected) return;
      setSelected(opt);
      const start = performance.now();
      const { data, error } = await supabase.rpc('submit_live_answer', {
        p_round_id: roundId,
        p_question_id: question.id,
        p_selected_option: opt,
        p_response_time_ms: Math.round(performance.now() - start) + 200,
      });
      if (!error && data?.[0]) setAwarded(data[0].awarded);
    },
    [question, selected, supabase, roundId]
  );

  const options: [Option, string][] = question
    ? [
        ['A', question.option_a],
        ['B', question.option_b],
        ['C', question.option_c],
        ['D', question.option_d],
      ]
    : [];

  // Computed in an effect, not inline during render — Date.now() is impure
  // and must not be called at render time (react-hooks/purity). The syncs
  // below are legitimate one-shot effect syncs (deriving from a changed prop),
  // same pattern as lib/components/count-up.tsx.
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  useEffect(() => {
    if (!question || !round.question_started_at) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemainingSeconds(0);
      return;
    }
    const startedAt = new Date(round.question_started_at).getTime();
    const compute = () => Math.max(0, question.time_limit_seconds - Math.floor((Date.now() - startedAt) / 1000));
    setRemainingSeconds(compute());
    const id = setInterval(() => setRemainingSeconds(compute()), 500);
    return () => clearInterval(id);
  }, [question, round.question_started_at]);

  // Quiet per-question feedback (skipped on the final question, which gets
  // the bigger drumroll + winner treatment below instead).
  useEffect(() => {
    if (awarded === null || isLastQuestion) return;
    playSound(awarded > 0 ? 'correct' : 'incorrect');
    vibrate(30);
  }, [awarded, isLastQuestion]);

  // Same suspense-before-reveal beat as the host screen (see host-client.tsx)
  // — kept in sync deliberately: same duration, same vibration pattern.
  const [suspense, setSuspense] = useState(false);
  useEffect(() => {
    if (round.phase !== 'reveal' || !isLastQuestion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot sync deriving from changed round.phase/isLastQuestion, same pattern as lib/components/count-up.tsx
      setSuspense(false);
      return;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setSuspense(false);
      return;
    }
    setSuspense(true);
    playSound('drumroll');
    vibrate([80, 60, 80, 60, 80, 60, 200]);
    const t = setTimeout(() => setSuspense(false), 1500);
    return () => clearTimeout(t);
  }, [round.phase, isLastQuestion]);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between text-xs text-accent">
        <span>Team: {teamName}</span>
        <span className="text-gold">+{pointsPerQuestion} J per correct answer</span>
      </div>

      {round.phase === 'lobby' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-lg font-medium">You&apos;re in!</p>
          <p className="text-sm text-tertiary">Waiting for the host to start the round…</p>
        </div>
      ) : null}

      {(round.phase === 'question' || round.phase === 'reveal') && !question ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-tertiary">Loading question…</p>
        </div>
      ) : null}

      {round.phase === 'question' && question ? (
        <div className="flex flex-1 flex-col gap-6">
          <EnergyBar key={question.id} totalSeconds={remainingSeconds || question.time_limit_seconds} running={!selected} onExpire={() => {}} />
          <h2 className="text-lg leading-snug font-medium">{question.text}</h2>
          <div className="flex flex-1 flex-col gap-3">
            {options.map(([key, label]) => {
              const isSelected = selected === key;
              return (
                <button
                  key={key}
                  onClick={() => choose(key)}
                  disabled={!!selected}
                  className="flex items-center justify-between rounded-[var(--radius)] border px-4 py-3.5 text-left text-sm transition-colors disabled:cursor-default"
                  style={{
                    borderColor: isSelected ? 'var(--gold)' : 'var(--border)',
                    background: isSelected ? 'var(--tier-volt-bg)' : 'var(--card)',
                  }}
                >
                  <span>
                    <span className="mr-2 text-tertiary">{key}.</span>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
          {selected ? (
            <p className="text-center text-sm text-tertiary">
              {awarded === null ? 'Locked in, waiting for the host…' : awarded > 0 ? `+${awarded} J!` : 'Not quite.'}
            </p>
          ) : null}
        </div>
      ) : null}

      {round.phase === 'reveal' && question && suspense ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="animate-pulse text-lg font-medium text-gold">Revealing the answer&hellip;</p>
          <p className="text-sm text-tertiary">Final question</p>
        </div>
      ) : null}

      {round.phase === 'reveal' && question && !suspense ? (
        <div className="flex flex-1 flex-col gap-6">
          <h2 className="text-lg leading-snug font-medium">{question.text}</h2>
          <div className="flex flex-1 flex-col gap-3">
            {options.map(([key, label]) => {
              const isCorrect = key === question.correct_option;
              const isWrongSelected = selected === key && !isCorrect;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-[var(--radius)] border px-4 py-3.5 text-left text-sm"
                  style={
                    isCorrect
                      ? { borderColor: 'var(--gold)', background: 'var(--tier-volt-bg)' }
                      : isWrongSelected
                        ? { borderColor: 'var(--accent)', background: 'var(--tier-current-bg)' }
                        : { borderColor: 'var(--border)', background: 'var(--card)' }
                  }
                >
                  <span>
                    <span className="mr-2 text-tertiary">{key}.</span>
                    {label}
                  </span>
                  {isCorrect ? <Check className="size-4 text-gold" aria-hidden /> : null}
                  {isWrongSelected ? <X className="size-4 text-accent" aria-hidden /> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {round.phase === 'leaderboard' ? (
        <div className="flex flex-1 flex-col gap-4">
          <h2 className="text-lg font-medium">Scoreboard</h2>
          <ul className="flex flex-col gap-2">
            {scoreboard.map((r) => (
              <li
                key={r.team_id}
                className="flex items-center justify-between rounded-[var(--radius)] border px-4 py-3"
                style={
                  r.team_name === teamName
                    ? { borderColor: 'var(--gold)', background: 'var(--tier-volt-bg)' }
                    : { borderColor: 'var(--border)', background: 'var(--card)' }
                }
              >
                <span className="flex items-center gap-2 text-sm">
                  {r.rank === 1 ? <Crown className="size-4 text-gold" aria-hidden /> : <span className="w-4 text-tertiary">{r.rank}</span>}
                  {r.team_name}
                </span>
                <span className="text-sm text-gold">{r.total_amount} J</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {round.phase === 'complete' ? (
        <div className="flex flex-1 flex-col gap-4">
          <h2 className="text-lg font-medium">Final standings</h2>
          <RevealScoreboard
            scale="compact"
            rows={scoreboard.map((r) => ({
              key: r.team_id,
              label: r.team_name,
              amount: r.total_amount,
              rank: r.rank,
              highlight: r.team_name === teamName,
            }))}
          />
        </div>
      ) : null}
    </main>
  );
}
