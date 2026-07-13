import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/lib/patterns/empty-state';
import { Users, Zap, Calendar, BookOpen } from '@/lib/icons';

export const metadata = { title: 'Event Report' };

export default async function EventReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

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

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="flex items-center gap-1.5 text-xs text-tertiary">
          <Calendar className="size-3.5" aria-hidden />
          {new Date(report.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          {event ? `, ${event.name}` : ''}
        </p>
        <h1 className="mt-2 text-2xl font-medium">{report.title}</h1>
      </div>

      {eventStats ? (
        <div className="flex gap-6 rounded-[var(--radius)] border border-border bg-card px-5 py-4">
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
      ) : null}

      {report.highlights && report.highlights.length > 0 ? (
        <ul className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-4 text-sm">
          {report.highlights.map((h: string, i: number) => (
            <li key={i} className="flex gap-2">
              <span className="text-gold">•</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-4 text-sm leading-relaxed text-foreground">
        {report.summary.split(/\n\s*\n/).map((paragraph: string, i: number) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
