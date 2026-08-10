'use client';
/**
 * Live Round — team play screen. Waits in the lobby, answers one question at
 * a time in lockstep with the host's projector, shows instant personal
 * feedback, then the shared scoreboard once the host reveals it. Realtime
 * (not polling) drives every phase change.
 */
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { EnergyBar } from '@/lib/components/energy-bar';
import { RevealScoreboard } from '@/lib/components/reveal-scoreboard';
import { playSound } from '@/lib/jules/sound';
import { vibrate } from '@/lib/jules/haptics';
import { AnswerGrid, type AnswerState } from '@/lib/patterns/answer-grid';
import { leaveLiveTeamAction } from './team-actions';
import { getQuizMilestone, MILESTONE_LABEL } from '@/lib/jules/quiz-milestones';
import { Check, X, Crown, Trophy, Home, RefreshCw } from '@/lib/icons';
import type { Database } from '@/lib/supabase/database.types';

type Round = Database['public']['Tables']['live_rounds']['Row'];
type LiveQuestion = Database['public']['Functions']['live_round_question']['Returns'][number];
type ScoreRow = Database['public']['Functions']['live_round_scoreboard']['Returns'][number];
type Option = 'A' | 'B' | 'C' | 'D';

export function TeamClient({
  roundId,
  teamId,
  initialRound,
  teamName,
  isLeader,
  pointsPerQuestion,
  totalQuestions,
}: {
  roundId: string;
  teamId: string;
  initialRound: Round;
  teamName: string;
  isLeader: boolean;
  pointsPerQuestion: number;
  totalQuestions: number;
}) {
  const [round, setRound] = useState(initialRound);
  const [question, setQuestion] = useState<LiveQuestion | null>(null);
  const [selected, setSelected] = useState<Option | null>(null);
  const [awarded, setAwarded] = useState<number | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [scoreboard, setScoreboard] = useState<ScoreRow[]>([]);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [isLeaving, startLeave] = useTransition();
  const [syncing, setSyncing] = useState(false);
  const supabase = useRef(createClient()).current;
  // Mirrors `round` so applyRoundUpdate/resync can compare "did the phase or
  // question actually change" without a stale closure over `round` — the
  // effect that owns the realtime subscription intentionally only depends on
  // [roundId] (see below), so anything it calls can't just close over state.
  const roundRef = useRef(round);
  useEffect(() => {
    roundRef.current = round;
  }, [round]);
  const milestone = getQuizMilestone(round.question_index, totalQuestions);

  // A brief input lockout right after each new question renders. Every
  // question renders the answer grid in the exact same 4 screen positions
  // (AnswerGrid, decision: Kahoot-style 2x2 grid) — so a tap physically
  // in flight for the PREVIOUS question (a "ghost tap") can land on the
  // NEWLY rendered grid at the same coordinates the instant it appears,
  // registering as an answer nobody consciously chose. Real-device reports
  // showed this landing as "a new question opens with an option already
  // ticked," worse on iPhone than Android — matching WebKit's known extra
  // touch-to-click conversion latency, which widens exactly this race
  // window. Locking input for a short beat after each question mount is
  // the standard fix for this class of bug in quiz/trivia UIs.
  const [inputReady, setInputReady] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot sync keyed to question.id changing, same pattern as the suspense/remainingSeconds effects below
    setInputReady(false);
    if (!question) return;
    const t = setTimeout(() => setInputReady(true), 400);
    return () => clearTimeout(t);
    // Deliberately keyed on question?.id, not the whole `question` object —
    // loadQuestion() only ever calls setQuestion with data for the id the
    // round is currently on, so a new object reference always means a new
    // id too; keying on the object itself would restart this lockout on
    // every unrelated re-render that happens to produce a fresh reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id]);

  function leaveTeam() {
    setLeaveError(null);
    startLeave(async () => {
      const result = await leaveLiveTeamAction(roundId, teamId);
      if (result.error) setLeaveError(result.error);
    });
  }

  const loadQuestion = useCallback(async () => {
    const { data } = await supabase.rpc('live_round_question', { p_round_id: roundId });
    setQuestion(data?.[0] ?? null);
  }, [supabase, roundId]);

  const loadScoreboard = useCallback(async () => {
    const { data } = await supabase.rpc('live_round_scoreboard', { p_round_id: roundId });
    setScoreboard(data ?? []);
  }, [supabase, roundId]);

  // Shared by both the live realtime handler and resync() below, so the two
  // paths can never apply a round update differently. Only clears the
  // pick/award when a genuinely NEW question starts (a real phase/index
  // change from what's currently on screen) — clearing unconditionally on
  // every 'question' phase (the old behavior) was correct for realtime
  // events, which only ever fire on a real change, but would wrongly wipe a
  // valid in-progress pick if resync() re-fetches the exact same phase
  // (e.g. a tab regaining focus mid-question with nothing having moved).
  const applyRoundUpdate = useCallback(
    (next: Round) => {
      const prev = roundRef.current;
      if (next.phase === 'question' && (prev.phase !== 'question' || next.question_index !== prev.question_index)) {
        setSelected(null);
        setAwarded(null);
        setAnswerError(null);
      }
      setRound(next);
      loadQuestion();
      if (next.phase === 'reveal' || next.phase === 'leaderboard' || next.phase === 'complete') {
        loadScoreboard();
      }
    },
    [loadQuestion, loadScoreboard]
  );

  // Re-fetches the round directly from the table (RLS already allows any
  // authenticated reader — "authenticated reads live rounds", migration
  // 0010) rather than relying on the realtime stream having delivered every
  // change. Supabase Realtime's postgres_changes does not replay missed
  // events, so a phone whose WebSocket drops (screen lock, backgrounding,
  // a flaky network switch — all common mid-quiz on a real device) can sit
  // stuck showing a stale question/phase indefinitely even after the
  // connection recovers, until something else happens to trigger a new
  // event. This is called on tab/app focus and on every realtime
  // (re)subscribe, so a dropped connection self-heals instead of requiring
  // a full page reload.
  const resync = useCallback(async () => {
    setSyncing(true);
    const { data } = await supabase.from('live_rounds').select('*').eq('id', roundId).maybeSingle();
    if (data) applyRoundUpdate(data as Round);
    setSyncing(false);
  }, [supabase, roundId, applyRoundUpdate]);

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
        (payload) => applyRoundUpdate(payload.new as Round)
      )
      .subscribe((status) => {
        // Fires on the initial subscribe too (a harmless extra fetch,
        // deduped by applyRoundUpdate's own no-op-if-unchanged comparison)
        // — the real value is that Supabase's client auto-resubscribes
        // after a dropped connection and calls this again with
        // 'SUBSCRIBED', which is exactly the moment a stale phone needs to
        // catch up on whatever it missed while disconnected.
        if (status === 'SUBSCRIBED') resync();
      });

    const onFocus = () => {
      if (document.visibilityState === 'visible') resync();
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onFocus);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  const choose = useCallback(
    async (opt: Option) => {
      // Only the team captain (whoever created the team) can submit an
      // answer — submit_live_answer enforces this server-side too, but
      // checking here avoids a pointless round-trip for the common case of
      // a teammate tapping an option on their own phone. !inputReady is the
      // ghost-tap guard above — belt-and-suspenders alongside AnswerGrid's
      // own `disabled` prop, in case a tap event somehow reaches the handler
      // despite the button being visually disabled.
      if (!isLeader || !question || selected || !inputReady) return;
      setSelected(opt);
      setAnswerError(null);
      const start = performance.now();
      const { data, error } = await supabase.rpc('submit_live_answer', {
        p_round_id: roundId,
        p_question_id: question.id,
        p_selected_option: opt,
        p_response_time_ms: Math.round(performance.now() - start) + 200,
      });
      if (error) {
        // Previously left `selected` set with no feedback on a failed
        // submission (a network blip, or the round having already moved on
        // underneath a stale phone) — the option looked "ticked" and locked
        // in, but the server never actually recorded an answer, so the
        // student would see no correct/wrong feedback at reveal time and no
        // points despite believing they'd answered. Un-tick it and say so,
        // so they can retry instead of being silently stuck.
        setSelected(null);
        setAnswerError('That didn’t go through, tap your answer again.');
        return;
      }
      if (data?.[0]) setAwarded(data[0].awarded);
    },
    [isLeader, question, selected, inputReady, supabase, roundId]
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

  // Quiet per-question feedback — gated on the host's real "Reveal answer"
  // click (round.phase actually becoming 'reveal'), not on the moment the
  // team submits an answer. awarded is set as soon as the RPC responds
  // (still mid-question), so without this gate the sound/vibration would
  // give away right/wrong before the host, or the rest of the room, has
  // seen anything — skipped on the final question, which gets the bigger
  // drumroll + winner treatment below instead.
  useEffect(() => {
    if (round.phase !== 'reveal' || awarded === null || milestone) return;
    playSound(awarded > 0 ? 'correct' : 'incorrect');
    vibrate(30);
  }, [round.phase, awarded, milestone]);

  // Same suspense-before-reveal beat as the host screen (see host-client.tsx)
  // — kept in sync deliberately: same duration, same vibration pattern.
  const [suspense, setSuspense] = useState(false);
  useEffect(() => {
    if (round.phase !== 'reveal' || !milestone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot sync deriving from changed round.phase/milestone, same pattern as lib/components/count-up.tsx
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
    // Matches the real drumroll.mp3's own length (~6.45s), same as the host
    // screen — kept in sync deliberately (see host-client.tsx).
    const t = setTimeout(() => setSuspense(false), 6500);
    return () => clearTimeout(t);
  }, [round.phase, milestone]);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between text-xs text-accent">
        <span>Team: {teamName}</span>
        <div className="flex items-center gap-3">
          <span className="text-gold">+{pointsPerQuestion} SP per correct answer</span>
          {/* Manual fallback alongside the automatic focus/reconnect resync
              above — cheap insurance for the rare case a phone's screen
              looks stuck and the student would rather tap something than
              wait. */}
          <button
            type="button"
            onClick={resync}
            disabled={syncing}
            aria-label="Refresh"
            className="text-tertiary disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden />
          </button>
        </div>
      </div>

      {round.phase === 'lobby' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-lg font-medium">You&apos;re in!</p>
          <p className="text-sm text-tertiary">Waiting for the host to start the round…</p>
          {leaveError ? <p className="text-sm text-accent">{leaveError}</p> : null}
          <button
            type="button"
            disabled={isLeaving}
            onClick={leaveTeam}
            className="mt-2 text-sm text-muted underline disabled:opacity-60"
          >
            {isLeaving ? 'Leaving…' : 'Not your team? Leave'}
          </button>
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
          {!isLeader ? (
            <p className="text-center text-xs text-tertiary">Your team captain is answering for the team.</p>
          ) : null}
          <div style={{ opacity: isLeader && inputReady ? 1 : 0.6 }}>
            <AnswerGrid
              options={options}
              disabled={!isLeader || !!selected || !inputReady}
              onSelect={choose}
              getState={(key): AnswerState => (selected === key ? 'selected' : 'neutral')}
            />
          </div>
          {isLeader && selected ? (
            <p className="text-center text-sm text-tertiary">Locked in, waiting for the host&hellip;</p>
          ) : null}
          {answerError ? <p className="text-center text-sm text-accent">{answerError}</p> : null}
        </div>
      ) : null}

      {round.phase === 'reveal' && question && suspense ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="animate-pulse text-lg font-medium text-gold">Revealing the answer&hellip;</p>
          <p className="text-sm text-tertiary">{milestone ? MILESTONE_LABEL[milestone] : null}</p>
        </div>
      ) : null}

      {round.phase === 'reveal' && question && !suspense ? (
        <div className="flex flex-1 flex-col gap-6">
          <h2 className="text-lg leading-snug font-medium">{question.text}</h2>
          <AnswerGrid
            options={options}
            disabled
            onSelect={() => {}}
            getState={(key): AnswerState => {
              const isCorrect = key === question.correct_option;
              if (isCorrect) return 'correct';
              if (selected === key) return 'wrong';
              return 'neutral';
            }}
            indicator={(state) => {
              if (state === 'correct') return <Check className="size-4 text-success" aria-hidden />;
              if (state === 'wrong') return <X className="size-4 text-accent" aria-hidden />;
              return null;
            }}
          />
          {awarded !== null ? (
            <p className={`text-center text-sm ${awarded > 0 ? 'text-success' : 'text-accent'}`}>
              {awarded > 0 ? `+${awarded} SP!` : 'Not quite.'}
            </p>
          ) : null}
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
                <span className="text-sm text-gold">{r.total_amount} SP</span>
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
          <div className="mt-2 flex flex-col gap-2">
            <Link
              href="/leaderboard"
              className="bg-adani-gradient flex items-center justify-center gap-1.5 rounded-[var(--radius)] py-3 text-sm font-medium text-white"
            >
              <Trophy className="size-4" aria-hidden />
              View Leaderboard
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-1.5 rounded-[var(--radius)] border border-border py-3 text-sm text-muted"
            >
              <Home className="size-4" aria-hidden />
              Back to Grid
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
