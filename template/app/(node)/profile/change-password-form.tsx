'use client';

import { useActionState, useState } from 'react';
import { changePasswordAction, type ChangePasswordResult } from './actions';
import { KeyRound } from '@/lib/icons';

const initialState: ChangePasswordResult = {};

export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-border py-3 text-sm text-muted"
      >
        <KeyRound className="size-4" aria-hidden />
        Change password
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
      <p className="text-sm font-medium">Change password</p>
      <input name="password" type="password" className="input" placeholder="New password" required minLength={8} />
      <input name="confirm" type="password" className="input" placeholder="Confirm new password" required minLength={8} />
      {state.error ? <p className="text-sm text-accent">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">Password updated.</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-[var(--radius)] bg-gold py-2 text-sm font-medium text-gold-foreground disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-[var(--radius)] border border-border py-2 text-sm text-muted"
        >
          Close
        </button>
      </div>
    </form>
  );
}
