'use client';

import { useState, useTransition } from 'react';
import { ChipListEditor } from '@/lib/patterns/chip-list-editor';
import { updateAllowedDomainsAction } from './actions';

export function DomainsEditor({ initial }: { initial: string[] }) {
  const [domains, setDomains] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await updateAllowedDomainsAction(domains);
      if (res.error) setError(res.error);
      else {
        setError(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ChipListEditor value={domains} onChange={setDomains} placeholder="e.g. yourcollege.edu" />
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={isPending}
          className="rounded-[var(--radius)] bg-gold px-3 py-1.5 text-xs font-medium text-gold-foreground disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save domains'}
        </button>
        {saved ? <span className="text-xs text-success">Saved</span> : null}
        {error ? <span className="text-xs text-accent">{error}</span> : null}
      </div>
    </div>
  );
}
