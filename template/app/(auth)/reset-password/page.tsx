'use client';

import { useActionState } from 'react';
import { resetPasswordAction, type ActionResult } from '../actions';

const initialState: ActionResult = {};

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-lg font-medium">Set a new password</h1>
        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">New password</span>
            <input name="password" type="password" className="auth-input" required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Confirm password</span>
            <input name="confirm" type="password" className="auth-input" required />
          </label>
          {state?.error ? (
            <p role="alert" className="text-sm text-accent">
              {state.error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded-[var(--radius)] bg-gold py-3 text-sm font-medium text-gold-foreground disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save password'}
          </button>
        </form>
      </div>
    </main>
  );
}
