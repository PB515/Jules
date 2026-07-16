'use client';

import { useState, useTransition } from 'react';
import { registerForEventAction, unregisterFromEventAction } from '@/app/(node)/dashboard/actions';

export function RegisterButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const { registrationFormUrl } = await registerForEventAction(eventId);
              // One click does both, per the confirmed registration model: record
              // it in our own system AND open the club's external form (if any) —
              // the form is their own supplementary data collection, not our
              // source of truth for "is this student registered."
              if (registrationFormUrl) window.open(registrationFormUrl, '_blank', 'noopener,noreferrer');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not register. Try again.');
            }
          });
        }}
        className="rounded-[var(--radius)] bg-gold px-4 py-2.5 text-sm font-medium text-gold-foreground disabled:opacity-60"
      >
        {isPending ? 'Registering…' : 'Register'}
      </button>
      {error ? <p className="text-xs text-accent">{error}</p> : null}
    </div>
  );
}

export function CancelRegistrationButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await unregisterFromEventAction(eventId);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not cancel. Try again.');
            }
          });
        }}
        className="rounded-[var(--radius)] border border-border px-4 py-2.5 text-sm text-muted disabled:opacity-60"
      >
        {isPending ? 'Canceling…' : 'Cancel registration'}
      </button>
      {error ? <p className="text-xs text-accent">{error}</p> : null}
    </div>
  );
}
