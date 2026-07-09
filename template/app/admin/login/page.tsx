'use client';

import { useActionState } from 'react';
import { adminLoginAction, type ActionResult } from '@/app/(auth)/actions';

const initialState: ActionResult = {};

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(adminLoginAction, initialState);

  return (
    <main className="flex flex-1 items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-muted">Jules</div>
          <h1 className="text-lg font-medium">Reactor Command Center</h1>
        </div>
        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Admin email</span>
            <input name="email" type="email" className="auth-input" autoComplete="email" required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Password</span>
            <input name="password" type="password" className="auth-input" autoComplete="current-password" required />
          </label>
          {state?.error ? (
            <p role="alert" className="text-sm text-accent">
              {state.error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-[var(--radius)] bg-accent py-3 text-sm font-medium text-accent-foreground disabled:opacity-60"
          >
            {pending ? 'Connecting…' : 'Enter'}
          </button>
        </form>
      </div>
    </main>
  );
}
