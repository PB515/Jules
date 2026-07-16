import { createClient } from '@/lib/supabase/server';
import { getAdmin } from '@/lib/auth/session';
import { EmptyState } from '@/lib/patterns/empty-state';
import { formatDateUTC, formatTimeUTC } from '@/lib/jules/format-date';
import { Users, Zap, Calendar, MapPinned, BookOpen, CircleCheck, Download } from '@/lib/icons';

export const metadata = { title: 'Event Report' };

const ATTACHMENT_GROUPS: { key: string; label: string }[] = [
  { key: 'attachment_attendance_list_paths', label: 'Attendance List' },
  { key: 'attachment_brochure_paths', label: 'Event Brochure/Flyer/e-invitation' },
  { key: 'attachment_geo_photos_paths', label: 'Geo-tagged photographs' },
  { key: 'attachment_media_coverage_paths', label: 'Social media/Print media coverage' },
];

export default async function EventReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = await getAdmin();

  const { data: report } = await supabase.from('event_reports').select('*').eq('id', id).maybeSingle();
  if (!report) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState icon={BookOpen} title="Report not found" />
      </div>
    );
  }

  const [{ data: events }, { data: stats }] = await Promise.all([
    supabase.rpc('public_events'),
    supabase.rpc('public_event_stats', { p_event_id: report.event_id }),
  ]);
  const event = (events ?? []).find((e) => e.id === report.event_id);
  const eventStats = stats?.[0];

  const attachmentGroups = ATTACHMENT_GROUPS.map(({ key, label }) => ({
    label,
    paths: (report as unknown as Record<string, string[]>)[key],
  })).filter((g) => g.paths.length > 0);

  const attachmentUrl = (path: string) => supabase.storage.from('event-report-attachments').getPublicUrl(path).data.publicUrl;

  const maxAttendanceBar = eventStats ? Math.max(eventStats.total_registered, eventStats.total_attendees, 1) : 1;

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-medium">{report.title}</h1>
        {event ? (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tertiary">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" aria-hidden />
              {formatDateUTC(event.event_date)}
              {' · '}
              {formatTimeUTC(event.event_date)}
            </span>
            {event.location ? (
              <span className="flex items-center gap-1.5">
                <MapPinned className="size-3.5" aria-hidden />
                {event.location}
              </span>
            ) : null}
            {event.club_name ? <span>Organised by {event.club_name}</span> : null}
          </div>
        ) : null}
        {report.coordinator_name ? (
          <p className="mt-1 text-xs text-tertiary">Coordinator: {report.coordinator_name}</p>
        ) : null}
        {admin ? (
          <a
            href={`/api/event-reports/${report.id}/docx`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-border px-3 py-1.5 text-xs text-muted hover:text-gold"
          >
            <Download className="size-3.5" aria-hidden />
            Download Word report
          </a>
        ) : null}
      </div>

      {eventStats ? (
        <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-card px-5 py-4">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-gold" aria-hidden />
              <div>
                <p className="text-lg font-medium">{eventStats.total_attendees}</p>
                <p className="text-xs text-tertiary">attendees</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-gold" aria-hidden />
              <div>
                <p className="text-lg font-medium">{eventStats.total_joules}</p>
                <p className="text-xs text-tertiary">Joules distributed</p>
              </div>
            </div>
          </div>

          {eventStats.total_registered > 0 || eventStats.total_attendees > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-tertiary">Registered</span>
                <div className="h-3 flex-1 rounded-full bg-background">
                  <div
                    className="h-3 rounded-full bg-border"
                    style={{ width: `${(eventStats.total_registered / maxAttendanceBar) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs text-tertiary">{eventStats.total_registered}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-tertiary">Attended</span>
                <div className="h-3 flex-1 rounded-full bg-background">
                  <div
                    className="h-3 rounded-full bg-gold"
                    style={{ width: `${(eventStats.total_attendees / maxAttendanceBar) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs text-tertiary">{eventStats.total_attendees}</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Introduction</h2>
        <p className="text-sm leading-relaxed">{report.introduction}</p>
      </section>

      {report.objectives && report.objectives.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Objectives</h2>
          <ul className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-4 text-sm">
            {report.objectives.map((o: string, i: number) => (
              <li key={i} className="flex gap-2">
                <span className="text-gold">•</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Event Highlights</h2>
        <p className="text-sm leading-relaxed">{report.event_highlights}</p>
      </section>

      {report.outcomes && report.outcomes.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Outcomes</h2>
          <ul className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-4 text-sm">
            {report.outcomes.map((o: string, i: number) => (
              <li key={i} className="flex gap-2">
                <span className="text-gold">•</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Conclusion</h2>
        <p className="text-sm leading-relaxed">{report.conclusion}</p>
      </section>

      {attachmentGroups.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Attachments</h2>
          <div className="flex flex-col gap-4">
            {attachmentGroups.map(({ label, paths }) => (
              <div key={label}>
                <p className="mb-1.5 flex items-center gap-2 text-sm text-tertiary">
                  <CircleCheck className="size-3.5 text-success" aria-hidden />
                  {label}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {paths.map((path) => (
                    // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, no next/image domain config needed
                    <img
                      key={path}
                      src={attachmentUrl(path)}
                      alt={label}
                      className="aspect-square w-full rounded-[var(--radius)] object-cover"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
