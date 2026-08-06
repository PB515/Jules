'use client';
/**
 * Live Round team formation — shown before the host starts the round, when
 * this student hasn't joined a team yet. Structurally mirrors async Surge
 * Mode's GroupRegistrationClient (app/(node)/surge/[surgeId]/group-
 * registration-client.tsx): create a team or join an open one; a lone
 * "team of 1" is the solo case, same as Surge groups.
 */
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { createLiveTeamAction, joinLiveTeamAction } from './team-actions';
import { Users } from '@/lib/icons';

interface OpenTeam {
  id: string;
  name: string;
  memberCount: number;
}

export function TeamFormationClient({
  roundId,
  roomCode,
  openTeams,
  studentName,
}: {
  roundId: string;
  roomCode: string;
  openTeams: OpenTeam[];
  studentName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <div className="flex items-center justify-center gap-2 text-sm text-muted">
        <Users className="size-4 text-gold" aria-hidden />
        Room {roomCode}
      </div>
      <p className="text-sm text-tertiary">Team up with classmates, or play solo.</p>
      <p className="text-xs text-tertiary">
        Whoever starts a team is its captain and answers for everyone. Other members share the team&apos;s
        points but don&apos;t answer themselves.
      </p>
      {error ? (
        <div className="rounded-[var(--radius)] border border-accent/30 bg-card p-3">
          <p className="text-sm text-accent">{error}</p>
          {/* A student can land here mid-action if the host started the
              round while this screen was still open (a stale page, since
              this screen has no live subscription of its own) — the RPC's
              own rejection is correct and now actually shown, but they
              still need a real way forward instead of a dead-end screen. */}
          <Link href="/live" className="mt-1 inline-block text-xs text-tertiary underline">
            ← Back to room code
          </Link>
        </div>
      ) : null}

      {openTeams.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
          {openTeams.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>
                {t.name} <span className="text-xs text-tertiary">({t.memberCount} joined)</span>
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => joinLiveTeamAction(roundId, t.id))}
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
            placeholder="Team name"
            maxLength={40}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending || !name.trim()}
              onClick={() =>
                run(async () => {
                  const result = await createLiveTeamAction(roundId, roomCode, name.trim());
                  // Only close/clear the form on success — previously did
                  // this unconditionally, so a rejected create (e.g. the
                  // round having already started) still closed the form on
                  // top of showing no error at all, discarding what the
                  // student typed for no reason.
                  if (!result.error) {
                    setCreating(false);
                    setName('');
                  }
                  return result;
                })
              }
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
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => createLiveTeamAction(roundId, roomCode, studentName))}
            className="rounded-[var(--radius)] bg-gold py-2.5 text-sm font-medium text-gold-foreground disabled:opacity-60"
          >
            {isPending ? 'Joining…' : 'Go solo'}
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-[var(--radius)] border border-dashed border-border py-2.5 text-sm text-muted hover:text-gold"
          >
            + Start a team
          </button>
        </div>
      )}
    </div>
  );
}
