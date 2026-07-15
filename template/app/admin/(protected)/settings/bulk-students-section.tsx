'use client';

import { useActionState } from 'react';
import { bulkCreateStudentsAction, type BulkStudentResult } from './actions';
import { CircleCheck, CircleX } from '@/lib/icons';

const initialState: BulkStudentResult = {};

export function BulkStudentsSection() {
  const [state, formAction, pending] = useActionState(bulkCreateStudentsAction, initialState);

  const succeeded = (state.results ?? []).filter((r) => r.tempPassword);

  function downloadCsv() {
    const header = 'name,email,temp_password';
    const rows = succeeded.map((r) => `${csvCell(r.name)},${csvCell(r.email)},${csvCell(r.tempPassword ?? '')}`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synergy-student-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">One student per line: Name, email</span>
          <textarea
            name="roster"
            className="input min-h-32 font-mono text-xs"
            placeholder={'Aditi Sharma, aditi.sharma@yourcollege.edu\nRahul Verma, rahul.verma@yourcollege.edu'}
            required
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius)] bg-gold py-2.5 text-sm font-medium text-gold-foreground disabled:opacity-60"
        >
          {pending ? 'Creating accounts…' : 'Create accounts'}
        </button>
      </form>

      {state.error ? <p className="text-sm text-accent">{state.error}</p> : null}

      {state.results ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-tertiary">
              {succeeded.length} of {state.results.length} account{state.results.length === 1 ? '' : 's'} created
            </p>
            {succeeded.length > 0 ? (
              <button
                type="button"
                onClick={downloadCsv}
                className="rounded-[var(--radius)] border border-border px-3 py-1.5 text-xs text-muted hover:text-gold"
              >
                Download CSV
              </button>
            ) : null}
          </div>
          <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card text-sm">
            {state.results.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate">{r.name || '(missing name)'}</p>
                  <p className="truncate text-xs text-tertiary">{r.email || '(missing email)'}</p>
                </div>
                {r.tempPassword ? (
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-success">
                    <CircleCheck className="size-3.5" aria-hidden />
                    Created
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-accent">
                    <CircleX className="size-3.5" aria-hidden />
                    {r.error}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
