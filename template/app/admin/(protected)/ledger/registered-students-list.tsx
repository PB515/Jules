'use client';
/**
 * Plain registered-students list + CSV download for the simplified
 * Professor/Committee-Member ledger view — a quick look-and-download tool,
 * not a live dashboard (that already exists at
 * grid/[eventId]/registrations for tracking during an event). Reuses the
 * exact rowsToCsv/downloadCsv pair registrations-client.tsx's own export
 * button already uses, so the two can never drift apart on CSV shape.
 */
import { EmptyState } from '@/lib/patterns/empty-state';
import { rowsToCsv, downloadCsv } from '@/lib/jules/csv-export';
import type { EventRegistrationRow } from '@/lib/jules/event-registrations';
import { Users, Download, CircleCheck } from '@/lib/icons';

export function RegisteredStudentsList({ eventName, registrations }: { eventName: string; registrations: EventRegistrationRow[] }) {
  function exportCsv() {
    const csv = rowsToCsv(
      ['Name', 'Email', 'Phone', 'Registered At (UTC)', 'Attended At (UTC)'],
      registrations.map((r) => [r.name, r.college_email, r.phone ?? '', r.registered_at, r.attended_at ?? ''])
    );
    downloadCsv(`${eventName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-registrations.csv`, csv);
  }

  if (registrations.length === 0) {
    return <EmptyState icon={Users} title="No registrations yet" message="Nobody has registered for this event." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{registrations.length} registered</p>
        <button
          onClick={exportCsv}
          className="flex min-h-11 items-center gap-1.5 rounded-[var(--radius)] border border-border px-3 text-xs text-muted hover:border-gold/50 hover:text-gold"
        >
          <Download className="size-3.5" aria-hidden />
          Download list
        </button>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
        {registrations.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <div>
              <p>{r.name}</p>
              <p className="text-xs text-tertiary">{r.college_email}</p>
            </div>
            {r.attended_at ? (
              <span className="flex shrink-0 items-center gap-1 text-xs text-success">
                <CircleCheck className="size-3.5" aria-hidden />
                Attended
              </span>
            ) : (
              <span className="shrink-0 text-xs text-tertiary">Registered</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
