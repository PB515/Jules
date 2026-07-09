'use client';

import { useActionState, useState } from 'react';
import { createAdminAction, type ActionResult } from './actions';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
}
interface EventOption {
  id: string;
  name: string;
}

const initialState: ActionResult = {};

export function RosterSection({ admins, events }: { admins: Admin[]; events: EventOption[] }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState('officer');
  const [state, formAction, pending] = useActionState(createAdminAction, initialState);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
        {admins.map((a) => (
          <li key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div>
              <p>{a.name}</p>
              <p className="text-xs text-tertiary">{a.email}</p>
            </div>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted">{a.role}</span>
          </li>
        ))}
      </ul>

      {open ? (
        <form action={formAction} className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
          <input name="name" className="input" placeholder="Name" required />
          <input name="email" type="email" className="input" placeholder="admin email" required />
          <select name="role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="owner">Owner</option>
            <option value="officer">Officer</option>
            <option value="volunteer">Volunteer</option>
          </select>
          {role === 'volunteer' ? (
            <select name="volunteer_event_id" className="input" required>
              <option value="">Scope to event…</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          ) : null}
          {state?.error ? <p className="text-sm text-accent">{state.error}</p> : null}
          {state?.tempPassword ? (
            <p className="rounded-[var(--radius)] border border-gold/40 bg-background p-2 font-mono text-xs text-gold">
              Temp password: {state.tempPassword} (relay it now, won&apos;t be shown again)
            </p>
          ) : null}
          <div className="flex gap-2">
            <button disabled={pending} className="flex-1 rounded-[var(--radius)] bg-gold py-2 text-sm font-medium text-gold-foreground">
              {pending ? 'Creating…' : 'Create admin'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-[var(--radius)] border border-border py-2 text-sm">
              Close
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="rounded-[var(--radius)] border border-dashed border-border py-2.5 text-sm text-muted hover:text-gold">
          + Add admin
        </button>
      )}
    </div>
  );
}
