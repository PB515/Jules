'use client';
/**
 * Month-over-month engagement, stacked by event type (spec §7). Plain CSS
 * bars — no chart library needed for a handful of months of club data.
 */
import { useState } from 'react';
import { EmptyState } from '@/lib/patterns/empty-state';
import { BarChart3 } from '@/lib/icons';
import type { EventType } from '@/lib/supabase/database.types';

interface Row {
  month: string;
  event_type: EventType;
  total_joules: number;
  scan_count: number;
}

const TYPE_COLOR: Record<EventType, string> = {
  standard_meeting: 'var(--border-muted)',
  expert_session: 'var(--gold)',
  volunteer_task: 'var(--accent)',
  surge: 'var(--success)',
};

const TYPE_LABEL: Record<EventType, string> = {
  standard_meeting: 'Standard',
  expert_session: 'Expert',
  volunteer_task: 'Volunteer',
  surge: 'Surge',
};

export function EngagementChart({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<{ month: string; row: Row } | null>(null);

  const months = Array.from(new Set(rows.map((r) => r.month))).sort();
  const maxTotal = Math.max(
    1,
    ...months.map((m) => rows.filter((r) => r.month === m).reduce((sum, r) => sum + r.total_joules, 0))
  );

  if (months.length === 0) {
    return <EmptyState icon={BarChart3} title="No engagement data yet" />;
  }

  return (
    <div>
      <div className="flex items-end gap-3 overflow-x-auto pb-2">
        {months.map((m) => {
          const monthRows = rows.filter((r) => r.month === m);
          return (
            <div key={m} className="flex w-14 shrink-0 flex-col items-center gap-1">
              <div className="flex h-40 w-full flex-col-reverse overflow-hidden rounded-md border border-border">
                {monthRows.map((r) => (
                  <button
                    key={r.event_type}
                    onClick={() => setSelected({ month: m, row: r })}
                    style={{
                      height: `${(r.total_joules / maxTotal) * 100}%`,
                      background: TYPE_COLOR[r.event_type],
                    }}
                    className="w-full transition-opacity hover:opacity-80"
                    aria-label={`${TYPE_LABEL[r.event_type]}: ${r.total_joules} J`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-tertiary">
                {new Date(m).toLocaleDateString(undefined, { month: 'short' })}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        {(Object.keys(TYPE_LABEL) as EventType[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm" style={{ background: TYPE_COLOR[t] }} />
            {TYPE_LABEL[t]}
          </span>
        ))}
      </div>

      {selected ? (
        <div className="mt-3 rounded-[var(--radius)] border border-border bg-card p-3 text-sm">
          <p className="font-medium">
            {TYPE_LABEL[selected.row.event_type]},{' '}
            {new Date(selected.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </p>
          <p className="text-tertiary">
            {selected.row.total_joules} J across {selected.row.scan_count} scans
          </p>
        </div>
      ) : null}
    </div>
  );
}
