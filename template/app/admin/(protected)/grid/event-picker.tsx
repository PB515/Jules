'use client';

import { useRouter } from 'next/navigation';
import { formatDateUTC } from '@/lib/jules/format-date';

interface EventOption {
  id: string;
  name: string;
  event_date: string;
}

export function EventPicker({ events, selected }: { events: EventOption[]; selected: string }) {
  const router = useRouter();
  return (
    <select className="input" value={selected} onChange={(e) => router.push(`/admin/grid?event=${e.target.value}`)}>
      {events.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name} ({formatDateUTC(e.event_date)})
        </option>
      ))}
    </select>
  );
}
