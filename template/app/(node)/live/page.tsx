'use client';
/**
 * Live Round join screen — enter the room code shown on the classroom
 * projector. Teams are now real multi-student groups (create or join one on
 * the next screen), not "one phone per team" — this step only resolves the
 * room code to a round.
 *
 * Also accepts a `?code=` query param (from scanning the host lobby's QR,
 * decision 43) to pre-fill the room code field — same Suspense-wrapped
 * pattern as app/(auth)/login/page.tsx for useSearchParams().
 */
import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MonitorPlay } from '@/lib/icons';
import { resolveRoomCodeAction, type ActionResult } from './actions';

const initialState: ActionResult = {};

export default function LiveJoinPage() {
  return (
    <Suspense fallback={null}>
      <LiveJoinForm />
    </Suspense>
  );
}

function LiveJoinForm() {
  const [state, formAction, pending] = useActionState(resolveRoomCodeAction, initialState);
  const params = useSearchParams();
  const codeFromQr = params.get('code')?.toUpperCase() ?? '';

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <MonitorPlay className="size-10 text-gold" aria-hidden />
      <div>
        <h1 className="text-lg font-medium">Join a Live Round</h1>
        <p className="mt-1 text-sm text-tertiary">Enter the code on the classroom screen.</p>
      </div>

      <form action={formAction} className="flex w-full max-w-xs flex-col gap-4">
        <input
          name="room_code"
          placeholder="ROOM CODE"
          defaultValue={codeFromQr}
          maxLength={4}
          autoCapitalize="characters"
          className="input text-center text-2xl tracking-[0.3em] uppercase"
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
          {pending ? 'Continuing…' : 'Continue'}
        </button>
      </form>
    </main>
  );
}
