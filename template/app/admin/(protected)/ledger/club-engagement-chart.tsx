'use client';

import { EmptyState } from '@/lib/patterns/empty-state';
import { Users } from '@/lib/icons';

interface Row {
  club_id: string;
  club_name: string;
  total_joules: number;
  total_attendees: number;
}

export function ClubEngagementChart({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <EmptyState icon={Users} title="No clubs yet" />;
  }

  const max = Math.max(1, ...rows.map((r) => r.total_joules));

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.club_id} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-xs text-tertiary" title={r.club_name}>
            {r.club_name}
          </span>
          <div className="h-3 flex-1 rounded-full bg-background">
            <div className="h-3 rounded-full bg-gold" style={{ width: `${(r.total_joules / max) * 100}%` }} />
          </div>
          <span className="w-16 shrink-0 text-right text-xs text-tertiary">{r.total_joules} J</span>
        </div>
      ))}
    </div>
  );
}
