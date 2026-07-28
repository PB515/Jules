'use client';
/**
 * Same shape as ledger/ledger-event-picker.tsx (pick an event, push a
 * `?event=` query param) — its own small copy since it lives in a
 * different route tree, matching that file's own stated reasoning.
 */
import { useRouter } from 'next/navigation';
import { formatDateUTC } from '@/lib/jules/format-date';

interface EventOption {
  id: string;
  name: string;
  event_date: string;
}

export function UpdateEventPicker({ events, selected }: { events: EventOption[]; selected?: string }) {
  const router = useRouter();
  return (
    <select
      className="input"
      value={selected ?? ''}
      onChange={(e) => router.push(`/admin/updates?event=${e.target.value}`)}
    >
      <option value="" disabled>
        Pick an event…
      </option>
      {events.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name} ({formatDateUTC(e.event_date)})
        </option>
      ))}
    </select>
  );
}
