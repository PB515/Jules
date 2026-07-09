'use client';

import { useActionState } from 'react';
import type { ActionResult } from '../actions';

export function NewRoundForm({
  surges,
  action,
  initialState,
}: {
  surges: { id: string; name: string; status: string }[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  initialState: ActionResult;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Surge</span>
        <select name="surge_id" className="input" required defaultValue="">
          <option value="" disabled>
            Choose a Surge&apos;s questions to play
          </option>
          {surges.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.status})
            </option>
          ))}
        </select>
      </label>
      {state?.error ? <p className="text-sm text-accent">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius)] bg-gold py-3 text-sm font-medium text-gold-foreground disabled:opacity-60"
      >
        {pending ? 'Starting…' : 'Start hosting'}
      </button>
    </form>
  );
}
