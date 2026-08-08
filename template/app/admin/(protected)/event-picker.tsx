'use client';
/**
 * Shared between Event Creation (`/admin/grid`) and Attendance
 * (`/admin/attendance`) — both are "pick one event from a list" screens
 * with their own base route, so `basePath` decides where the `?event=`
 * query param lands rather than each page carrying its own near-duplicate
 * picker.
 */
import { useRouter } from 'next/navigation';
import { formatDateUTC } from '@/lib/jules/format-date';

interface EventOption {
  id: string;
  name: string;
  event_date: string;
}

export function EventPicker({
  events,
  selected,
  basePath,
}: {
  events: EventOption[];
  selected: string;
  basePath: string;
}) {
  const router = useRouter();
  return (
    <select className="input" value={selected} onChange={(e) => router.push(`${basePath}?event=${e.target.value}`)}>
      {events.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name} ({formatDateUTC(e.event_date)})
        </option>
      ))}
    </select>
  );
}
