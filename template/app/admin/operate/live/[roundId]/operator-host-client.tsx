'use client';
/**
 * No-login twin of host-client.tsx — same phase flow (lobby -> question ->
 * reveal -> leaderboard -> ... -> complete), authorized purely by the
 * `token` prop (a long random secret from live_rounds.operator_token)
 * instead of an admin session. Deliberately POLLING, not Realtime — a real
 * simplification versus the authenticated host screen, since giving an
 * anonymous caller a Realtime subscription would mean opening RLS reads on
 * live_round_teams/live_round_team_members to `anon` too, a materially
 * bigger surface than a few extra token-checked RPCs
 * (db/migrations/0051_operator_links.sql). Team/member counts ride along
 * on live_round_scoreboard's own return shape instead of separate table
 * reads, for the same reason.
 */
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Crown, Check, Loader2 } from '@/lib/icons';
import { EmptyState } from '@/lib/patterns/empty-state';
import { ShieldAlert } from '@/lib/icons';
import { RevealScoreboard } from '@/lib/components/reveal-scoreboard';
import { playSound } from '@/lib/jules/sound';
import { vibrate } from '@/lib/jules/haptics';
import { getQuizMilestone, MILESTONE_LABEL, type QuizMilestone } from '@/lib/jules/quiz-milestones';
import { site } from '@/lib/site';
import type { LivePhase } from '@/lib/supabase/database.types';
import QRCode from 'react-qr-code';

type Question = {
  id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string | null;
  time_limit_seconds: number;
};
type ScoreRow = {
  team_id: string;
  team_name: string;
  total_amount: number;
  rank: number;
  team_count: number;
  member_count: number;
};
type Option = 'A' | 'B' | 'C' | 'D';

export function OperatorHostClient({ roundId, token }: { roundId: string; token: string }) {
  const [notFound, setNotFound] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [phase, setPhase] = useState<LivePhase>('lobby');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState<string | null>(null);
  const [surgeName, setSurgeName] = useState('');
  const [pointsPerQuestion, setPointsPerQuestion] = useState(20);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scoreboard, setScoreboard] = useState<ScoreRow[]>([]);
  const [teamCount, setTeamCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setNotFound(true);
      return;
    }
    const supabase = createClient();
    const [roundRes, scoreRes] = await Promise.all([
      supabase.rpc('get_round_for_operator', { p_round_id: roundId, p_token: token }),
      supabase.rpc('live_round_scoreboard', { p_round_id: roundId, p_token: token }),
    ]);
    if (roundRes.error || !roundRes.data || roundRes.data.length === 0) {
      setNotFound(true);
      return;
    }
    const rows = roundRes.data;
    const first = rows[0];
    setRoomCode(first.room_code);
    setPhase(first.phase as LivePhase);
    setQuestionIndex(first.question_index);
    setQuestionStartedAt(first.question_started_at);
    setSurgeName(first.surge_name);
    setPointsPerQuestion(first.points_per_question);
    setQuestions(
      rows.map((r) => ({
        id: r.question_id,
        text: r.question_text,
        option_a: r.option_a,
        option_b: r.option_b,
        option_c: r.option_c,
        option_d: r.option_d,
        correct_option: r.correct_option,
        time_limit_seconds: r.time_limit_seconds,
      }))
    );
    if (scoreRes.data) {
      setScoreboard(scoreRes.data);
      setTeamCount(scoreRes.data[0]?.team_count ?? 0);
      setMemberCount(scoreRes.data[0]?.member_count ?? 0);
    }
  }, [roundId, token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot fetch on mount plus a poll, same pattern as station-client.tsx's own poll effect
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  const advance = useCallback(async () => {
    setAdvancing(true);
    setAdvanceError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc('host_advance_round', { p_round_id: roundId, p_token: token });
    if (error) {
      setAdvanceError(error.message);
    } else {
      await refresh();
    }
    setAdvancing(false);
  }, [roundId, token, refresh]);

  const q = questions[questionIndex];
  const isLast = questionIndex + 1 >= questions.length;
  const milestone = getQuizMilestone(questionIndex, questions.length);

  const [suspense, setSuspense] = useState(false);
  useEffect(() => {
    if (phase !== 'reveal' || !milestone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate one-shot sync deriving from changed phase/milestone, same pattern as lib/components/count-up.tsx
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
    const t = setTimeout(() => setSuspense(false), 6500);
    return () => clearTimeout(t);
  }, [phase, milestone]);

  if (notFound) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-2 p-8 text-center">
        <EmptyState icon={ShieldAlert} title="This link isn't valid" message="Ask the person who shared it to send a fresh one." />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent">
        {surgeName || 'Loading…'} · Live Round
      </div>

      {phase === 'lobby' ? <LobbyView roomCode={roomCode} teamCount={teamCount} memberCount={memberCount} /> : null}

      {phase === 'question' && q ? (
        <QuestionView q={q} index={questionIndex} total={questions.length} startedAt={questionStartedAt} memberCount={memberCount} />
      ) : null}

      {(phase === 'reveal' || phase === 'leaderboard') && q ? (
        <RevealView
          q={q}
          points={pointsPerQuestion}
          phase={phase}
          scoreboard={scoreboard}
          suspense={suspense}
          milestone={milestone}
        />
      ) : null}

      {phase === 'complete' ? <FinalView scoreboard={scoreboard} /> : null}

      {advanceError ? <p className="text-sm text-accent">{advanceError}</p> : null}

      {phase !== 'complete' ? (
        <button
          onClick={advance}
          disabled={advancing || !surgeName || (phase === 'lobby' && memberCount === 0)}
          className="flex items-center gap-2 rounded-[var(--radius)] bg-adani-gradient px-8 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(0,140,168,0.3)] disabled:opacity-50"
        >
          {advancing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {phase === 'lobby'
            ? 'Start round'
            : phase === 'question'
              ? 'Reveal answer'
              : phase === 'reveal'
                ? 'Show scoreboard'
                : isLast
                  ? 'Finish round'
                  : 'Next question'}
        </button>
      ) : null}
    </div>
  );
}

function LobbyView({ roomCode, teamCount, memberCount }: { roomCode: string; teamCount: number; memberCount: number }) {
  const joinLink = `${site.url}/live?code=${roomCode}`;
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted">Students form or join a team at /live with this code, or scan to join</p>
      <div className="rounded-[var(--radius)] bg-white p-3">
        <QRCode value={joinLink} size={140} />
      </div>
      <div className="rounded-2xl border-2 border-accent bg-card px-12 py-8 text-6xl font-medium tracking-[0.3em] text-gold">
        {roomCode || '····'}
      </div>
      <p className="text-lg text-foreground">
        {teamCount} team{teamCount === 1 ? '' : 's'}, {memberCount} student{memberCount === 1 ? '' : 's'} joined
      </p>
    </div>
  );
}

function QuestionView({
  q,
  index,
  total,
  startedAt,
  memberCount,
}: {
  q: Question;
  index: number;
  total: number;
  startedAt: string | null;
  memberCount: number;
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
      <p className="text-lg text-gold">Up to {memberCount} students answering</p>
    </div>
  );
}

function RevealView({
  q,
  points,
  phase,
  scoreboard,
  suspense,
  milestone,
}: {
  q: Question;
  points: number;
  phase: LivePhase;
  scoreboard: ScoreRow[];
  suspense: boolean;
  milestone: QuizMilestone | null;
}) {
  const options: [Option, string][] = [
    ['A', q.option_a],
    ['B', q.option_b],
    ['C', q.option_c],
    ['D', q.option_d],
  ];

  if (phase === 'reveal' && suspense) {
    return (
      <div className="flex w-full flex-col items-center gap-4 py-16 text-center">
        <p className="animate-pulse text-lg font-medium text-gold">Revealing the answer&hellip;</p>
        <p className="text-sm text-tertiary">{milestone ? MILESTONE_LABEL[milestone] : null}</p>
      </div>
    );
  }

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
                      ? { borderColor: 'var(--success)', background: 'var(--card)' }
                      : { borderColor: 'var(--border)', background: 'var(--card)' }
                  }
                >
                  <span>
                    <span className="mr-2 text-tertiary">{key}.</span>
                    {label}
                  </span>
                  {isCorrect ? <Check className="size-5 text-success" aria-hidden /> : null}
                </div>
              );
            })}
          </div>
          <p className="text-sm text-tertiary">Correct answers earn +{points} SP</p>
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
      <RevealScoreboard
        scale="full"
        rows={scoreboard.map((r) => ({ key: r.team_id, label: r.team_name, amount: r.total_amount, rank: r.rank }))}
      />
    </div>
  );
}

function Scoreboard({ rows }: { rows: ScoreRow[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => {
        const isFirst = r.rank === 1;
        return (
          <li
            key={r.team_id}
            className={`flex items-center justify-between rounded-[var(--radius)] border bg-card px-4 py-3 ${
              isFirst ? 'border-transparent' : 'border-border'
            }`}
            style={isFirst ? { boxShadow: 'inset 0 0 0 1.5px var(--adani-teal)' } : undefined}
          >
            <span className="flex items-center gap-2 text-lg">
              {isFirst ? (
                <span className="bg-adani-gradient flex size-6 items-center justify-center rounded-full text-white">
                  <Crown className="size-3.5" aria-hidden />
                </span>
              ) : (
                <span className="w-5 text-tertiary">{r.rank}</span>
              )}
              {r.team_name}
            </span>
            <span className={`text-lg ${isFirst ? 'text-adani-gradient font-semibold' : 'text-gold'}`}>{r.total_amount} SP</span>
          </li>
        );
      })}
    </ul>
  );
}
