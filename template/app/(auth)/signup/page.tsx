'use client';
/**
 * Onboarding — "The Connection" (spec §6). Name, college email, phone,
 * password; a connection-strength meter fills 25% per completed field and the
 * CTA turns gold once all four are filled. Target: under 30 seconds.
 */
import { Suspense, useActionState, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signupAction, type ActionResult } from '../actions';
import { site } from '@/lib/site';

const initialState: ActionResult = {};

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);
  const next = useSearchParams().get('next') ?? '';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const strength = useMemo(() => {
    let n = 0;
    if (name.trim()) n++;
    if (email.trim()) n++;
    if (phone.trim()) n++;
    if (password.trim().length >= 8) n++;
    return n * 25;
  }, [name, email, phone, password]);

  const ready = strength === 100;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-2xl font-medium tracking-tight text-gold">{site.name}</div>
          <h1 className="text-lg font-medium">Make the Connection</h1>
          <p className="mt-1 text-sm text-muted">Every atom generates a spark.</p>
        </div>

        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-card">
          <div
            className="h-full rounded-full bg-gold transition-all duration-500 ease-out"
            style={{ width: `${strength}%` }}
          />
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <Field label="Name">
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Your full name"
              autoComplete="name"
            />
          </Field>
          <Field label="College email">
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@yourcollege.edu"
              autoComplete="email"
            />
          </Field>
          <Field label="Phone">
            <input
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="10-digit number"
              autoComplete="tel"
            />
          </Field>
          <Field label="Password">
            <input
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </Field>

          {state?.error ? (
            <p role="alert" className="text-sm text-accent">
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!ready || pending}
            className="mt-2 rounded-[var(--radius)] py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed"
            style={{
              background: ready ? 'var(--gold)' : 'var(--card)',
              color: ready ? 'var(--gold-foreground)' : 'var(--tertiary)',
              border: ready ? 'none' : '1px solid var(--border)',
            }}
          >
            {pending ? 'Connecting…' : 'Connect'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already connected?{' '}
          <Link href="/login" className="text-gold">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}
