'use client';

import { Suspense, useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loginAction, type ActionResult } from '../actions';
import { site } from '@/lib/site';

const initialState: ActionResult = {};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const params = useSearchParams();
  const locked = params.get('locked');
  const next = params.get('next') ?? '';

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-2xl font-medium tracking-tight text-gold">{site.name}</div>
          <h1 className="text-lg font-medium">Reconnect</h1>
        </div>

        {locked ? (
          <p className="mb-4 rounded-[var(--radius)] border border-accent/40 bg-card p-3 text-sm text-accent">
            This account is locked. Contact club leadership.
          </p>
        ) : null}

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">College email</span>
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
            className="mt-2 rounded-[var(--radius)] bg-gold py-3 text-sm font-medium text-gold-foreground disabled:opacity-60"
          >
            {pending ? 'Connecting…' : 'Log in'}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-muted">
          <Link href="/forgot-password" className="text-gold">
            Lost connection?
          </Link>
          <p>
            New to Jules?{' '}
            <Link href="/signup" className="text-gold">
              Connect now
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
