/**
 * Visual streak indicator — an interlocking chain of rings, one per
 * consecutive event attended. Replaces a bare flame icon + number, which
 * read ambiguously once "streak" stopped meaning "days active" and started
 * meaning "consecutive attended registered events" (decision 47) — a chain
 * makes "consecutive" legible at a glance instead of relying on a label.
 * A broken chain (zero streak) is a dashed, unlinked ring, not just a
 * smaller number. The exact count is always spelled out in real text next
 * to the rings (rings are decorative/aria-hidden), so the count is never
 * conveyed by the visual alone. Server-renderable, no client hooks.
 */
const MAX_RINGS = 6;

export function StreakChain({ count }: { count: number }) {
  const ringCount = count === 0 ? 1 : Math.min(count, MAX_RINGS);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center">
        {Array.from({ length: ringCount }).map((_, i) => (
          <div
            key={i}
            aria-hidden
            style={{
              width: i % 2 === 0 ? 11 : 17,
              height: i % 2 === 0 ? 17 : 11,
              marginLeft: i === 0 ? 0 : -6,
              borderRadius: 9999,
              border: '2.5px solid',
              borderColor: count === 0 ? 'var(--border)' : 'var(--gold)',
              borderStyle: count === 0 ? 'dashed' : 'solid',
            }}
          />
        ))}
      </div>
      <span className="text-sm font-medium">
        {count === 0 ? 'No streak yet' : `${count} event${count === 1 ? '' : 's'} in a row`}
      </span>
    </div>
  );
}
