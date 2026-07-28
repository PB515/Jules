'use client';
/**
 * Five separate tidy CSVs (not one pre-aggregated file) — the shape
 * Power BI/Excel actually wants (fact tables joined to dimension tables),
 * and the same "CSV Report Library" pattern real comparable products
 * (CampusGroups, Modern Campus Involve) use as their primary export path.
 * Reuses the existing shared rowsToCsv()/downloadCsv() from
 * lib/jules/csv-export.ts — the established, deliberately-reused pattern
 * — rather than a new one-off inline builder.
 */
import { useState } from 'react';
import { rowsToCsv, downloadCsv } from '@/lib/jules/csv-export';
import { Download } from '@/lib/icons';
import {
  fetchStudentsReportAction,
  fetchEventsReportAction,
  fetchAttendanceReportAction,
  fetchQuizReportAction,
  fetchJouleLedgerReportAction,
} from './actions';

interface Scope {
  seasonId: string | null;
  clubId: string | null;
}

function stamp(key: string) {
  return `synergy-${key}-${new Date().toISOString().slice(0, 10)}.csv`;
}

async function downloadStudents(scope: Scope) {
  const rows = await fetchStudentsReportAction(scope);
  const csv = rowsToCsv(
    ['student_id', 'name', 'email', 'season_joules', 'lifetime_joules', 'tier', 'streak'],
    rows.map((r) => [r.student_id, r.name, r.email, String(r.season_joules), String(r.lifetime_joules), r.tier, String(r.streak)])
  );
  downloadCsv(stamp('students'), csv);
}

async function downloadEvents(scope: Scope) {
  const rows = await fetchEventsReportAction(scope);
  const csv = rowsToCsv(
    ['event_id', 'name', 'club_name', 'type', 'event_date', 'location', 'joule_value'],
    rows.map((r) => [r.event_id, r.name, r.club_name, r.type, r.event_date, r.location ?? '', String(r.joule_value)])
  );
  downloadCsv(stamp('events'), csv);
}

async function downloadAttendance(scope: Scope) {
  const rows = await fetchAttendanceReportAction(scope);
  const csv = rowsToCsv(
    ['event_name', 'student_name', 'student_email', 'registered_at', 'attended_at'],
    rows.map((r) => [r.event_name, r.student_name, r.student_email, r.registered_at, r.attended_at ?? ''])
  );
  downloadCsv(stamp('attendance'), csv);
}

async function downloadQuiz(scope: Scope) {
  const rows = await fetchQuizReportAction(scope);
  const csv = rowsToCsv(
    ['surge_name', 'student_name', 'student_email', 'mode', 'joined_at'],
    rows.map((r) => [r.surge_name, r.student_name, r.student_email, r.mode, r.joined_at])
  );
  downloadCsv(stamp('quiz-participation'), csv);
}

async function downloadLedger(scope: Scope) {
  const rows = await fetchJouleLedgerReportAction(scope);
  const csv = rowsToCsv(
    ['student_name', 'student_email', 'type', 'amount', 'source_name', 'created_at'],
    rows.map((r) => [r.student_name, r.student_email, r.type, String(r.amount), r.source_name ?? '', r.created_at])
  );
  downloadCsv(stamp('joule-ledger'), csv);
}

const REPORTS = [
  { key: 'students', label: 'Students', description: 'Every student with computed totals: season/lifetime Joules, tier, streak.', download: downloadStudents },
  { key: 'events', label: 'Events', description: 'Every event in scope: club, type, date, location, Joule value.', download: downloadEvents },
  { key: 'attendance', label: 'Attendance', description: 'One row per student per event, the core "who came to what" table.', download: downloadAttendance },
  { key: 'quiz', label: 'Quiz participation', description: 'Every Surge/Live Round a student joined, async or live.', download: downloadQuiz },
  { key: 'ledger', label: 'Joule ledger', description: 'Every point transaction, the richest raw table, source and amount per row.', download: downloadLedger },
] as const;

export function ReportButtons({ scope }: { scope: Scope }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, download: (scope: Scope) => Promise<void>) {
    setLoading(key);
    setError(null);
    try {
      await download(scope);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build that report.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {REPORTS.map((r) => (
        <div key={r.key} className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">{r.label}</p>
            <p className="mt-0.5 text-xs text-tertiary">{r.description}</p>
          </div>
          <button
            type="button"
            onClick={() => run(r.key, r.download)}
            disabled={loading === r.key}
            className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-border px-3 py-1.5 text-xs text-muted hover:text-gold disabled:opacity-60"
          >
            <Download className="size-3.5" aria-hidden />
            {loading === r.key ? 'Building…' : 'Download CSV'}
          </button>
        </div>
      ))}
      {error ? <p className="text-sm text-accent">{error}</p> : null}
    </div>
  );
}
