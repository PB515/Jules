'use client';

import { useActionState, useState } from 'react';
import { createClubAction, updateClubDetailsAction, type ActionResult } from './actions';
import { BulletListField } from '@/lib/patterns/bullet-list-field';
import { EmptyState } from '@/lib/patterns/empty-state';
import { Users, Pencil } from '@/lib/icons';

interface Club {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  x_url: string | null;
  mentor_name: string | null;
  gain: string[];
  activities: string[];
}

const initialState: ActionResult = {};

export function ClubsSection({ clubs }: { clubs: Club[] }) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(createClubAction, initialState);

  return (
    <div className="flex flex-col gap-3">
      {clubs.length === 0 ? (
        <EmptyState icon={Users} title="No clubs yet" />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
          {clubs.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 px-4 py-2.5 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p>{c.name}</p>
                  <p className="text-xs text-tertiary">{c.description ?? c.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">{c.slug}</span>
                  <button
                    type="button"
                    onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                    aria-label={`Edit ${c.name} details`}
                    className="flex size-7 items-center justify-center rounded-[var(--radius)] border border-border text-muted hover:text-gold"
                  >
                    <Pencil className="size-3.5" aria-hidden />
                  </button>
                </div>
              </div>
              {editingId === c.id ? <ClubDetailsForm club={c} onDone={() => setEditingId(null)} /> : null}
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <form action={formAction} className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
          <input name="name" className="input" placeholder="Club name" required />
          <input name="slug" className="input" placeholder="club-slug" required />
          <input name="description" className="input" placeholder="Short description (optional)" />
          {state?.error ? <p className="text-sm text-accent">{state.error}</p> : null}
          <div className="flex gap-2">
            <button disabled={pending} className="flex-1 rounded-[var(--radius)] bg-gold py-2 text-sm font-medium text-gold-foreground">
              {pending ? 'Adding…' : 'Add club'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-[var(--radius)] border border-border py-2 text-sm">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="rounded-[var(--radius)] border border-dashed border-border py-2.5 text-sm text-muted hover:text-gold">
          + Add club
        </button>
      )}
    </div>
  );
}

function ClubDetailsForm({ club, onDone }: { club: Club; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(updateClubDetailsAction, initialState);
  const [gain, setGain] = useState(club.gain.length > 0 ? club.gain : ['']);
  const [activities, setActivities] = useState(club.activities.length > 0 ? club.activities : ['']);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-background p-3">
      <input type="hidden" name="club_id" value={club.id} />

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Focus (shown on the club&apos;s public page)</span>
        <textarea name="description" className="input min-h-16 text-xs" defaultValue={club.description ?? ''} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Faculty mentor</span>
        <input name="mentor_name" className="input text-xs" defaultValue={club.mentor_name ?? ''} placeholder="e.g. Dr. Namita Pragya" />
      </label>

      <BulletListField label="What You Gain" name="gain" placeholder="e.g. Direct exposure to industry through guest lectures" items={gain} setItems={setGain} />
      <BulletListField label="Activities" name="activities" placeholder="e.g. Speaker series with industry leaders" items={activities} setItems={setActivities} />

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <span className="text-xs text-muted">Social links</span>
        <input name="instagram_url" type="url" className="input text-xs" placeholder="Instagram URL" defaultValue={club.instagram_url ?? ''} />
        <input name="linkedin_url" type="url" className="input text-xs" placeholder="LinkedIn URL" defaultValue={club.linkedin_url ?? ''} />
        <input name="x_url" type="url" className="input text-xs" placeholder="X (Twitter) URL" defaultValue={club.x_url ?? ''} />
      </div>

      {state?.error ? <p className="text-sm text-accent">{state.error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-[var(--radius)] bg-gold py-1.5 text-xs font-medium text-gold-foreground"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onDone} className="flex-1 rounded-[var(--radius)] border border-border py-1.5 text-xs">
          Close
        </button>
      </div>
    </form>
  );
}
