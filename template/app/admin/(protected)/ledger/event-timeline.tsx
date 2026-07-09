'use client';

import { useState } from 'react';
import type { EventType } from '@/lib/supabase/database.types';
import { ChevronDown, ChevronUp } from '@/lib/icons';

interface EventRow {
  id: string;
  name: string;
  type: EventType;
  event_date: string;
  location: string | null;
  total_attendees: number;
  total_joules: number;
}

const FILTERS: { key: 'all' | EventType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'standard_meeting', label: 'Standard' },
  { key: 'expert_session', label: 'Expert' },
  { key: 'volunteer_task', label: 'Volunteer' },
  { key: 'surge', label: 'Surge' },
];

export function EventTimeline({ events }: { events: EventRow[] }) {
  const [filter, setFilter] = useState<'all' | EventType>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-xs ${
              filter === f.key ? 'border-gold text-gold' : 'border-border text-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-tertiary">No events in this filter.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
          {filtered.map((e) => {
            const isOpen = expanded === e.id;
            return (
              <li key={e.id}>
                <button
                  onClick={() => setExpanded(isOpen ? null : e.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm"
                >
                  <span>{e.name}</span>
                  {isOpen ? <ChevronUp className="size-4 text-tertiary" /> : <ChevronDown className="size-4 text-tertiary" />}
                </button>
                {isOpen ? (
                  <div className="grid grid-cols-2 gap-2 px-4 pb-3 text-xs text-muted">
                    <p>Date: {new Date(e.event_date).toLocaleString()}</p>
                    <p>Location: {e.location ?? 'n/a'}</p>
                    <p>Attendees: {e.total_attendees}</p>
                    <p>Joules generated: {e.total_joules}</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
