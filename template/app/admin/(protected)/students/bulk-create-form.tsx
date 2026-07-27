'use client';
/**
 * Redesigned bulk student creation UI — previously one dense section buried
 * inside Institution Settings (a paste-box + a flat pass/fail list with no
 * summary emphasis). Same underlying action/validation, just a clearer
 * layout: a two-column split (input on the left, live results on the right)
 * so the "N of M created" outcome reads immediately instead of scrolling
 * past the form to find it, plus a plain-text file upload as an alternative
 * to pasting for a real 300+ roster.
 */
import { useActionState, useRef } from 'react';
import { bulkCreateStudentsAction, type BulkStudentResult } from './actions';
import { EmptyState } from '@/lib/patterns/empty-state';
import { CircleCheck, CircleX, Upload, FileText, UserPlus } from '@/lib/icons';

const initialState: BulkStudentResult = {};

export function BulkCreateForm() {
  const [state, formAction, pending] = useActionState(bulkCreateStudentsAction, initialState);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const succeeded = (state.results ?? []).filter((r) => r.tempPassword);
  const failed = (state.results ?? []).filter((r) => !r.tempPassword);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (textareaRef.current) {
        const existing = textareaRef.current.value.trim();
        const incoming = String(reader.result ?? '').trim();
        textareaRef.current.value = existing ? `${existing}\n${incoming}` : incoming;
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <form action={formAction} className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label htmlFor="roster" className="text-xs font-medium text-muted">
            One student per line: Name, email
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-[var(--radius)] border border-border px-2.5 py-1 text-xs text-muted hover:text-gold"
          >
            <Upload className="size-3.5" aria-hidden />
            Upload .txt/.csv
          </button>
          <input ref={fileInputRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleFile} />
        </div>
        <textarea
          ref={textareaRef}
          id="roster"
          name="roster"
          className="input min-h-64 font-mono text-xs"
          placeholder={'Aditi Sharma, aditi.sharma@yourcollege.edu\nRahul Verma, rahul.verma@yourcollege.edu'}
          required
        />
        <p className="text-xs text-tertiary">Up to 500 at a time. Same file format the upload button accepts.</p>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-[var(--radius)] bg-adani-gradient py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          <UserPlus className="size-4" aria-hidden />
          {pending ? 'Creating accounts…' : 'Create accounts'}
        </button>
        {state.error ? <p className="text-sm text-accent">{state.error}</p> : null}
      </form>

      <div className="flex flex-col gap-3">
        {state.results ? (
          <>
            <div className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-card p-4">
              <div>
                <p className="text-2xl font-medium">
                  {succeeded.length} <span className="text-base font-normal text-tertiary">of {state.results.length} created</span>
                </p>
                {failed.length > 0 ? <p className="text-xs text-accent">{failed.length} failed, see below</p> : null}
              </div>
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
            <div className="overflow-hidden rounded-[var(--radius)] border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-slate text-left text-xs text-muted">
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Email</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {state.results.map((r, i) => (
                    <tr key={i}>
                      <td className="max-w-32 truncate px-4 py-2.5">{r.name || '(missing)'}</td>
                      <td className="max-w-40 truncate px-4 py-2.5 text-tertiary">{r.email || '(missing)'}</td>
                      <td className="px-4 py-2.5">
                        {r.tempPassword ? (
                          <span className="flex items-center gap-1.5 text-xs text-success">
                            <CircleCheck className="size-3.5" aria-hidden />
                            Created
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-accent">
                            <CircleX className="size-3.5" aria-hidden />
                            {r.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState
            icon={FileText}
            title="Results will appear here"
            message="Paste or upload a roster on the left and create accounts. Each row's outcome shows up in this table."
          />
        )}
      </div>
    </div>
  );
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
