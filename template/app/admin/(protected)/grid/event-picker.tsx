'use client';

import { useRouter } from 'next/navigation';

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
          {e.name} ({new Date(e.event_date).toLocaleDateString()})
        </option>
      ))}
    </select>
  );
}
