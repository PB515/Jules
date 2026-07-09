/**
 * "The Power Grid" (spec §6, Node Dashboard) — a 20-cell grid where each lit
 * cell represents one logged activity (event scan or Surge participation).
 */
export function PowerGrid({ litCount, total = 20 }: { litCount: number; total?: number }) {
  const cells = Array.from({ length: total }, (_, i) => i < litCount);
  return (
    <div className="grid grid-cols-5 gap-2" role="img" aria-label={`${Math.min(litCount, total)} of ${total} activities logged`}>
      {cells.map((lit, i) => (
        <div
          key={i}
          className="aspect-square rounded-md border transition-colors"
          style={
            lit
              ? { background: 'var(--gold)', borderColor: 'var(--gold)' }
              : { background: 'var(--card)', borderColor: 'var(--border)' }
          }
        />
      ))}
    </div>
  );
}
