import { Target, Gift, Calendar } from '@/lib/icons';

export function CardTrio({
  focus,
  gain,
  activities,
}: {
  focus: string | null;
  gain: string[];
  activities: string[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-4">
        <Target className="size-5 text-gold" aria-hidden />
        <p className="text-sm font-medium">Focus</p>
        <p className="text-xs text-muted">{focus ?? 'Details coming soon.'}</p>
      </div>

      {gain.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-4">
          <Gift className="size-5 text-gold" aria-hidden />
          <p className="text-sm font-medium">What You Gain</p>
          <ul className="flex flex-col gap-1 text-xs text-muted">
            {gain.map((g) => (
              <li key={g} className="flex gap-1.5">
                <span className="text-accent">•</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {activities.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-4">
          <Calendar className="size-5 text-gold" aria-hidden />
          <p className="text-sm font-medium">Activities</p>
          <ul className="flex flex-col gap-1 text-xs text-muted">
            {activities.map((a) => (
              <li key={a} className="flex gap-1.5">
                <span className="text-accent">•</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {gain.length === 0 && activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-dashed border-border bg-card p-4 text-center sm:col-span-2">
          <p className="text-xs text-tertiary">More details coming soon.</p>
        </div>
      ) : null}
    </div>
  );
}
