/**
 * A labeled horizontal bar for a small breakdown list (event attendance,
 * Joules by source). Shared between the student's own Profile page and the
 * admin Student Data Vault so both render the exact same "My activity"
 * shape. Server-renderable, no client hooks.
 */
export function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-tertiary">{label}</span>
      <div className="h-2.5 flex-1 rounded-full bg-background">
        <div
          className="h-2.5 rounded-full"
          style={{ width: `${(Math.abs(value) / max) * 100}%`, background: color }}
        />
      </div>
      <span className="w-10 text-right text-xs text-tertiary">{value}</span>
    </div>
  );
}
