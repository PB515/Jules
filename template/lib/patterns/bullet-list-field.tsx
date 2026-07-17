'use client';

import { Plus, Trash2 } from '@/lib/icons';

export function BulletListField({
  label,
  name,
  placeholder,
  items,
  setItems,
}: {
  label: string;
  name: string;
  placeholder: string;
  items: string[];
  setItems: (fn: (prev: string[]) => string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      {items.map((h, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            name={name}
            className="input flex-1"
            placeholder={placeholder}
            value={h}
            onChange={(e) => setItems((prev) => prev.map((item, idx) => (idx === i ? e.target.value : item)))}
          />
          {items.length > 1 ? (
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
              className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] border border-border text-accent"
              aria-label={`Remove ${label.toLowerCase()} item`}
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, ''])}
        className="flex items-center justify-center gap-1.5 rounded-[var(--radius)] border border-dashed border-border py-2 text-xs text-muted hover:text-gold"
      >
        <Plus className="size-3.5" aria-hidden />
        Add {label.toLowerCase()}
      </button>
    </div>
  );
}
