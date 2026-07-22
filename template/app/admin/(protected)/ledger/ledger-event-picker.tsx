'use client';
/**
 * Same shape as grid/event-picker.tsx (pick an event, push a `?event=`
 * query param) — kept as its own small copy rather than a shared/parameterized
 * component, since the two live in different route trees and this one is
 * deliberately tied to /admin/ledger's simplified Professor/Committee-Member
 * view only.
 */
import { useRouter } from 'next/navigation';
import { formatDateUTC } from '@/lib/jules/format-date';

interface EventOption {
  id: string;
  name: string;
  event_date: string;
}

export function LedgerEventPicker({ events, selected }: { events: EventOption[]; selected: string }) {
  const router = useRouter();
  return (
    <select className="input" value={selected} onChange={(e) => router.push(`/admin/ledger?event=${e.target.value}`)}>
      {events.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name} ({formatDateUTC(e.event_date)})
        </option>
      ))}
    </select>
  );
}
