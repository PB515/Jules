'use client';

import { useTransition } from 'react';
import { registerForEventAction, unregisterFromEventAction } from './actions';

export function RegisterButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => { await registerForEventAction(eventId); })}
      className="shrink-0 rounded-full bg-gold px-3 py-1.5 text-xs font-medium text-gold-foreground disabled:opacity-60"
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
      className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-muted disabled:opacity-60"
    >
      {isPending ? 'Canceling…' : 'Cancel'}
    </button>
  );
}
