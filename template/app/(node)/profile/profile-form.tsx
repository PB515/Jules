'use client';

import { ViewEditForm } from '@/lib/patterns/view-edit-form';
import { updateProfile } from './actions';

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  return (
    <ViewEditForm
      initial={{ name, phone }}
      save={updateProfile}
      view={(value, edit) => (
        <div className="rounded-[var(--radius)] border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">{value.name}</p>
              <p className="text-xs text-tertiary">{value.phone || 'No phone on file'}</p>
            </div>
            <button onClick={edit} className="text-xs text-gold">
              Edit
            </button>
          </div>
        </div>
      )}
      edit={({ draft, set, save, cancel, saving, error }) => (
        <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Name</span>
            <input className="input" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Phone</span>
            <input className="input" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
          </label>
          {error ? <p className="text-sm text-accent">{error}</p> : null}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 rounded-[var(--radius)] bg-gold py-2 text-sm font-medium text-gold-foreground disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={cancel} className="flex-1 rounded-[var(--radius)] border border-border py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
    />
  );
}
