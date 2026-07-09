'use client';
/**
 * Hybrid Surge Builder (spec §7) — CSV import + manual "Add spark", inline
 * editable, per Surge. CSV rows with errors are excluded from import and
 * shown with the reason; duplicates and out-of-range time limits are
 * flagged but still importable (spec §9).
 */
import { useMemo, useState, useTransition } from 'react';
import { parseQuestionsCsv, type ParsedRow } from '@/lib/jules/csv';
import {
  addQuestionAction,
  deleteQuestionAction,
  importQuestionsAction,
  setSurgeStatusAction,
  updateQuestionAction,
} from '../actions';
import { Upload, Plus, Trash2, Check, AlertCircle } from '@/lib/icons';
import type { Database } from '@/lib/supabase/database.types';

type Surge = Database['public']['Tables']['surges']['Row'];
type Question = Database['public']['Tables']['questions']['Row'];

const STATUS_FLOW: Record<Surge['status'], Surge['status'] | null> = {
  draft: 'live',
  live: 'complete',
  complete: null,
};

export function BuilderClient({ surge, questions }: { surge: Surge; questions: Question[] }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(surge.status);
  const next = STATUS_FLOW[status];

  function advanceStatus() {
    if (!next) return;
    startTransition(async () => {
      await setSurgeStatusAction(surge.id, next);
      setStatus(next);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium">{surge.name}</h1>
          <p className="text-xs text-tertiary">{surge.points_per_question} J per correct answer</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border px-2.5 py-1 text-xs capitalize text-muted">{status}</span>
          {next ? (
            <button
              onClick={advanceStatus}
              disabled={isPending}
              className="rounded-[var(--radius)] bg-gold px-3 py-1.5 text-xs font-medium text-gold-foreground disabled:opacity-60"
            >
              {isPending ? 'Updating…' : next === 'live' ? 'Go live' : 'Close Surge'}
            </button>
          ) : null}
        </div>
      </div>

      {status === 'draft' ? <CsvImport surgeId={surge.id} /> : null}
      {status === 'draft' ? <ManualAdd surgeId={surge.id} nextOrder={questions.length} /> : null}

      <QuestionList surgeId={surge.id} questions={questions} editable={status === 'draft'} />
    </div>
  );
}

function CsvImport({ surgeId }: { surgeId: string }) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  function parse() {
    const { rows } = parseQuestionsCsv(text);
    setRows(rows);
    setResult(null);
  }

  function confirmImport() {
    if (!rows) return;
    startTransition(async () => {
      const res = await importQuestionsAction(surgeId, rows);
      setResult(res);
      setRows(null);
      setText('');
    });
  }

  return (
    <section className="rounded-[var(--radius)] border border-border bg-card p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-medium">
        <Upload className="size-4" aria-hidden />
        Import from CSV
      </h2>
      <p className="mb-3 text-xs text-tertiary">
        Schema: question,option_a,option_b,option_c,option_d,correct_option,time_limit_seconds,tag
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste CSV content here…"
        rows={5}
        className="input mb-3 font-mono text-xs"
      />
      {!rows ? (
        <button onClick={parse} disabled={!text.trim()} className="rounded-[var(--radius)] border border-border px-3 py-2 text-xs disabled:opacity-50">
          Preview
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="max-h-64 overflow-y-auto rounded-[var(--radius)] border border-border">
            <table className="w-full text-left text-xs">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line} className="border-b border-border last:border-0">
                    <td className="w-10 px-2 py-1.5 text-tertiary">{r.line}</td>
                    <td className="px-2 py-1.5">{r.question || <span className="text-tertiary">(empty)</span>}</td>
                    <td className="w-40 px-2 py-1.5">
                      {r.errors.length > 0 ? (
                        <span className="flex items-center gap-1 text-accent">
                          <AlertCircle className="size-3" aria-hidden />
                          {r.errors[0]}
                        </span>
                      ) : r.duplicate ? (
                        <span className="text-accent">duplicate, imported anyway</span>
                      ) : r.time_limit_flagged ? (
                        <span className="text-accent">time out of range, imported anyway</span>
                      ) : (
                        <span className="flex items-center gap-1 text-success">
                          <Check className="size-3" aria-hidden />
                          ok
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={confirmImport}
              disabled={isPending || rows.every((r) => r.errors.length > 0)}
              className="rounded-[var(--radius)] bg-gold px-3 py-2 text-xs font-medium text-gold-foreground disabled:opacity-50"
            >
              {isPending ? 'Importing…' : `Import ${rows.filter((r) => r.errors.length === 0).length} question(s)`}
            </button>
            <button onClick={() => setRows(null)} className="rounded-[var(--radius)] border border-border px-3 py-2 text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}
      {result ? (
        <p className="mt-3 text-xs text-success">
          Imported {result.imported} question(s){result.skipped ? `, skipped ${result.skipped} with errors` : ''}.
        </p>
      ) : null}
    </section>
  );
}

interface QuestionDraft {
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  time_limit_seconds: number;
  tag: string;
}

const BLANK_QUESTION: QuestionDraft = {
  text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'A',
  time_limit_seconds: 15,
  tag: '',
};

function ManualAdd({ surgeId, nextOrder }: { surgeId: string; nextOrder: number }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(BLANK_QUESTION);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!draft.text.trim() || !draft.option_a || !draft.option_b || !draft.option_c || !draft.option_d) {
      setError('Fill in the question and all four options.');
      return;
    }
    startTransition(async () => {
      try {
        await addQuestionAction(surgeId, { ...draft, order_index: nextOrder });
        setDraft(BLANK_QUESTION);
        setOpen(false);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not add question.');
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-1.5 rounded-[var(--radius)] border border-dashed border-border py-3 text-sm text-muted hover:text-gold"
      >
        <Plus className="size-4" aria-hidden />
        Add spark manually
      </button>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
      <textarea
        className="input"
        placeholder="Question text"
        value={draft.text}
        onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
        rows={2}
        maxLength={280}
      />
      {(['A', 'B', 'C', 'D'] as const).map((key) => {
        const field = `option_${key.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d';
        return (
          <div key={key} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct"
              checked={draft.correct_option === key}
              onChange={() => setDraft((d) => ({ ...d, correct_option: key }))}
              aria-label={`Option ${key} is correct`}
            />
            <input
              className="input"
              placeholder={`Option ${key}`}
              value={draft[field]}
              onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
              maxLength={80}
            />
          </div>
        );
      })}
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs text-muted">Time limit (s)</span>
          <input
            type="number"
            className="input"
            value={draft.time_limit_seconds}
            onChange={(e) => setDraft((d) => ({ ...d, time_limit_seconds: parseInt(e.target.value, 10) || 15 }))}
            min={5}
            max={120}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs text-muted">Tag (optional)</span>
          <input className="input" value={draft.tag} onChange={(e) => setDraft((d) => ({ ...d, tag: e.target.value }))} />
        </label>
      </div>
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={isPending}
          className="flex-1 rounded-[var(--radius)] bg-gold py-2 text-sm font-medium text-gold-foreground disabled:opacity-60"
        >
          {isPending ? 'Adding…' : 'Add question'}
        </button>
        <button onClick={() => setOpen(false)} className="flex-1 rounded-[var(--radius)] border border-border py-2 text-sm">
          Cancel
        </button>
      </div>
    </section>
  );
}

function QuestionList({ surgeId, questions, editable }: { surgeId: string; questions: Question[]; editable: boolean }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const count = useMemo(() => questions.length, [questions]);

  if (count === 0) {
    return <p className="rounded-[var(--radius)] border border-dashed border-border p-6 text-center text-sm text-tertiary">No questions yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {questions.map((q) => (
        <li key={q.id} className="rounded-[var(--radius)] border border-border bg-card p-4">
          {editingId === q.id ? (
            <QuestionEditRow surgeId={surgeId} question={q} onDone={() => setEditingId(null)} />
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm">{q.text}</p>
                <p className="mt-1 text-xs text-tertiary">
                  Correct: {q.correct_option} · {q.time_limit_seconds}s{q.tag ? ` · ${q.tag}` : ''}
                </p>
              </div>
              {editable ? (
                <div className="flex shrink-0 gap-2 text-xs">
                  <button onClick={() => setEditingId(q.id)} className="text-gold">
                    Edit
                  </button>
                  <button
                    onClick={() => deleteQuestionAction(q.id, surgeId)}
                    className="flex items-center gap-1 text-accent"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function QuestionEditRow({ surgeId, question, onDone }: { surgeId: string; question: Question; onDone: () => void }) {
  const [draft, setDraft] = useState(question);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateQuestionAction(question.id, surgeId, {
        text: draft.text,
        option_a: draft.option_a,
        option_b: draft.option_b,
        option_c: draft.option_c,
        option_d: draft.option_d,
        correct_option: draft.correct_option,
        time_limit_seconds: draft.time_limit_seconds,
        tag: draft.tag,
      });
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea className="input" value={draft.text} onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))} rows={2} />
      {(['A', 'B', 'C', 'D'] as const).map((key) => {
        const field = `option_${key.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d';
        return (
          <div key={key} className="flex items-center gap-2">
            <input
              type="radio"
              checked={draft.correct_option === key}
              onChange={() => setDraft((d) => ({ ...d, correct_option: key }))}
            />
            <input className="input" value={draft[field]} onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))} />
          </div>
        );
      })}
      <div className="flex gap-2">
        <button onClick={save} disabled={isPending} className="rounded-[var(--radius)] bg-gold px-3 py-1.5 text-xs font-medium text-gold-foreground">
          Save
        </button>
        <button onClick={onDone} className="rounded-[var(--radius)] border border-border px-3 py-1.5 text-xs">
          Cancel
        </button>
      </div>
    </div>
  );
}
