'use client';

import { useActionState } from 'react';
import { uploadGalleryImageAction, type ActionResult } from './actions';

const initialState: ActionResult = {};

export function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadGalleryImageAction, initialState);

  return (
    <form action={formAction} className="mb-6 flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Photo</span>
        <input name="file" type="file" accept="image/*" required className="text-sm" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Caption (optional)</span>
        <input name="caption" className="input" placeholder="Winter Surge, December 2026" />
      </label>
      {state?.error ? <p className="text-sm text-accent">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[var(--radius)] bg-gold px-4 py-2 text-xs font-medium text-gold-foreground disabled:opacity-60"
      >
        {pending ? 'Uploading…' : 'Upload'}
      </button>
    </form>
  );
}
