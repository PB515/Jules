'use client';
/**
 * Account Recovery — "Lost connection?" (spec §7). Uses Supabase's own
 * resetPasswordForEmail flow (a magic-link OTP under the hood) rather than a
 * hand-rolled 6-digit-code table — same user-facing shape the spec describes,
 * fewer moving parts to get wrong. Deviation logged in CLAUDE.md build log.
 */
import { useActionState } from 'react';
import Link from 'next/link';
import { forgotPasswordAction, type ActionResult } from '../actions';

const initialState: ActionResult = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);
  const sent = state && state.error === undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-lg font-medium">Lost connection?</h1>
        <p className="mb-6 text-sm text-muted">
          Enter your college email and we&apos;ll send a link to set a new password.
        </p>

        {sent ? (
          <p className="rounded-[var(--radius)] border border-success/40 bg-card p-3 text-sm text-success">
            If that email is connected to Jules, a reset link is on its way.
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input
              name="email"
              type="email"
              placeholder="you@yourcollege.edu"
              className="auth-input"
              required
            />
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
              {pending ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="text-gold">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
