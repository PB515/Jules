'use client';

import { useTransition } from 'react';
import { registerForEventAction, unregisterFromEventAction } from '@/app/(node)/dashboard/actions';

export function RegisterButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const { registrationFormUrl } = await registerForEventAction(eventId);
          // One click does both, per the confirmed registration model: record
          // it in our own system AND open the club's external form (if any) —
          // the form is their own supplementary data collection, not our
          // source of truth for "is this student registered."
          if (registrationFormUrl) window.open(registrationFormUrl, '_blank', 'noopener,noreferrer');
        })
      }
      className="rounded-[var(--radius)] bg-gold px-4 py-2.5 text-sm font-medium text-gold-foreground disabled:opacity-60"
    >
      {isPending ? 'Registering…' : 'Register'}
    </button>
  );
}

export function CancelRegistrationButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => { await unregisterFromEventAction(eventId); })}
      className="rounded-[var(--radius)] border border-border px-4 py-2.5 text-sm text-muted disabled:opacity-60"
    >
      {isPending ? 'Canceling…' : 'Cancel registration'}
    </button>
  );
}
