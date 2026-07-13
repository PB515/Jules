'use client';

import { useState, useTransition } from 'react';
import { createGroupAction, joinGroupAction, leaveGroupAction } from './group-actions';
import { Users } from '@/lib/icons';

interface MyGroup {
  id: string;
  name: string;
  members: string[];
}
interface OpenGroup {
  id: string;
  name: string;
  memberCount: number;
}

export function GroupRegistrationClient({
  surgeId,
  myGroup,
  openGroups,
}: {
  surgeId: string;
  myGroup: MyGroup | null;
  openGroups: OpenGroup[];
}) {
  const [isPending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  }

  if (myGroup) {
    return (
      <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-gold/40 bg-card p-4">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-gold" aria-hidden />
          <p className="text-sm font-medium">You&apos;re in {myGroup.name}</p>
        </div>
        <p className="text-xs text-tertiary">{myGroup.members.join(', ')}</p>
        {error ? <p className="text-sm text-accent">{error}</p> : null}
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => leaveGroupAction(surgeId, myGroup.id))}
          className="rounded-[var(--radius)] border border-border py-2 text-sm text-muted disabled:opacity-60"
        >
          {isPending ? 'Leaving…' : 'Leave group'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Playing solo right now. Team up, or just wait here.</p>
      {error ? <p className="text-sm text-accent">{error}</p> : null}

      {openGroups.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
          {openGroups.map((g) => (
            <li key={g.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>
                {g.name} <span className="text-xs text-tertiary">({g.memberCount} joined)</span>
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => joinGroupAction(surgeId, g.id))}
                className="rounded-full bg-gold px-3 py-1.5 text-xs font-medium text-gold-foreground disabled:opacity-60"
              >
                Join
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {creating ? (
        <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Group name"
            maxLength={60}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending || !name.trim()}
              onClick={() => run(async () => {
                await createGroupAction(surgeId, name.trim());
                setCreating(false);
                setName('');
              })}
              className="flex-1 rounded-[var(--radius)] bg-gold py-2 text-sm font-medium text-gold-foreground disabled:opacity-60"
            >
              {isPending ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="flex-1 rounded-[var(--radius)] border border-border py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-[var(--radius)] border border-dashed border-border py-2.5 text-sm text-muted hover:text-gold"
        >
          + Start a group
        </button>
      )}
    </div>
  );
}
