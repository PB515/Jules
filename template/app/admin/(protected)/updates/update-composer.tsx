'use client';

import { useActionState } from 'react';
import { sendEventUpdateAction, type SendUpdateResult } from './actions';

const initialState: SendUpdateResult = {};

export function UpdateComposer({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [state, formAction, pending] = useActionState(sendEventUpdateAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
      <input type="hidden" name="event_id" value={eventId} />
      <p className="text-xs text-muted">
        Sends to every student registered for <span className="font-medium text-foreground">{eventName}</span>, as
        a push notification and in their in-app notification history.
      </p>
      <textarea
        name="message"
        required
        className="input min-h-24 text-sm"
        placeholder="e.g. Bring your laptops, the speaker has been confirmed, don't forget to register…"
      />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[var(--radius)] bg-adani-gradient px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send to registered students'}
      </button>
      {state.error ? <p className="text-sm text-accent">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">Sent.</p> : null}
    </form>
  );
}
