'use client';
/**
 * Live Surge Mode (spec §6). One question at a time, locked/distraction-free.
 * Questions are pre-fetched once (passed in as a prop from the server page) —
 * the only network calls during play are the per-answer submissions.
 */
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { EnergyBar } from '@/lib/components/energy-bar';
import { Check, X } from '@/lib/icons';
import type { Database } from '@/lib/supabase/database.types';

type Question = Database['public']['Functions']['start_surge']['Returns'][number];
type Option = 'A' | 'B' | 'C' | 'D';

type Phase = 'answering' | 'revealed' | 'expired';

export function SurgeClient({ surgeId, questions }: { surgeId: string; questions: Question[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('answering');
  const [selected, setSelected] = useState<Option | null>(null);
  const [correctOption, setCorrectOption] = useState<Option | null>(null);
  const [awarded, setAwarded] = useState(0);
  const [totalAwarded, setTotalAwarded] = useState(0);
  const [questionKey, setQuestionKey] = useState(0); // forces EnergyBar remount per question

  const q = questions[index];
  const options = useMemo(
    () =>
      q
        ? ([
            ['A', q.option_a],
            ['B', q.option_b],
            ['C', q.option_c],
            ['D', q.option_d],
          ] as [Option, string][])
        : [],
    [q]
  );

  const advance = useCallback(() => {
    if (index + 1 >= questions.length) {
      router.push(`/surge/${surgeId}/matrix`);
      return;
    }
    setIndex((i) => i + 1);
    setPhase('answering');
    setSelected(null);
    setCorrectOption(null);
    setAwarded(0);
    setQuestionKey((k) => k + 1);
  }, [index, questions.length, router, surgeId]);

  const choose = useCallback(
    async (opt: Option) => {
      if (phase !== 'answering') return;
      setSelected(opt);
      setPhase('revealed');

      const start = performance.now();
      const supabase = createClient();
      const { data, error } = await supabase.rpc('submit_surge_answer', {
        p_question_id: q.id,
        p_selected_option: opt,
        p_response_time_ms: Math.round(performance.now() - start) + 200,
      });

      if (!error && data?.[0]) {
        setCorrectOption(data[0].correct_option);
        setAwarded(data[0].awarded);
        setTotalAwarded((t) => t + data[0].awarded);
      }
      setTimeout(advance, 1100);
    },
    [phase, q, advance]
  );

  const onExpire = useCallback(() => {
    if (phase !== 'answering') return;
    setPhase('expired');
    setTimeout(advance, 1100);
  }, [phase, advance]);

  if (!q) return null;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between text-xs text-tertiary">
        <span>
          Question {index + 1} / {questions.length}
        </span>
        <span className="text-gold">+{totalAwarded} J so far</span>
      </div>

      <EnergyBar key={questionKey} totalSeconds={q.time_limit_seconds} running={phase === 'answering'} onExpire={onExpire} />

      <h2 className="text-lg leading-snug font-medium">{q.text}</h2>

      <div className="flex flex-1 flex-col gap-3">
        {options.map(([key, label]) => {
          const isSelected = selected === key;
          const isCorrect = phase !== 'answering' && correctOption === key;
          const isWrongSelected = phase === 'revealed' && isSelected && correctOption !== key;

          let style: React.CSSProperties = { borderColor: 'var(--border)', background: 'var(--card)' };
          if (isCorrect) style = { borderColor: 'var(--gold)', background: 'var(--tier-volt-bg)' };
          else if (isWrongSelected) style = { borderColor: 'var(--accent)', background: 'var(--tier-current-bg)' };

          return (
            <button
              key={key}
              onClick={() => choose(key)}
              disabled={phase !== 'answering'}
              className="flex items-center justify-between rounded-[var(--radius)] border px-4 py-3.5 text-left text-sm transition-colors disabled:cursor-default"
              style={style}
            >
              <span>
                <span className="mr-2 text-tertiary">{key}.</span>
                {label}
              </span>
              {isCorrect ? <Check className="size-4 text-gold" aria-hidden /> : null}
              {isWrongSelected ? <X className="size-4 text-accent" aria-hidden /> : null}
            </button>
          );
        })}
      </div>

      {phase === 'expired' ? <p className="text-center text-sm text-tertiary">Time&apos;s up</p> : null}
      {phase === 'revealed' && awarded > 0 ? (
        <p className="text-center text-sm text-gold">+{awarded} J</p>
      ) : null}
    </div>
  );
}
