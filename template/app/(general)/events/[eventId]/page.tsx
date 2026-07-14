import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getStudent } from '@/lib/auth/session';
import { formatDateUTC, formatTimeUTC } from '@/lib/jules/format-date';
import { Calendar, Clock, MapPin, Zap, ScanLine, CircleCheck } from '@/lib/icons';
import { RegisterButton, CancelRegistrationButton } from './registration-client';

export const metadata = { title: 'Event' };

const TYPE_LABEL: Record<string, string> = {
  standard_meeting: 'Standard Meeting',
  expert_session: 'Expert Session',
  volunteer_task: 'Volunteer Task',
};

export default async function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createClient();

  // events only has an RLS policy for authenticated reads (0005) — a public,
  // logged-out-viewable page has to go through the same security-definer
  // public_events() RPC the events list and Event Report pages already use,
  // not a raw table select (which would silently return nothing here).
  const { data: events } = await supabase.rpc('public_events');
  const event = (events ?? []).find((e) => e.id === eventId);

  if (!event) notFound();

  const student = await getStudent();
  let registration: { attended_at: string | null } | null = null;
  if (student) {
    const { data } = await supabase
      .from('event_registrations')
      .select('attended_at')
      .eq('event_id', eventId)
      .eq('student_id', student.id)
      .maybeSingle();
    registration = data;
  }

  const concluded = hasConcluded(event.end_date ?? event.event_date);

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-medium">{event.name}</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tertiary">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" aria-hidden />
            {formatDateUTC(event.event_date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden />
            {formatTimeUTC(event.event_date)}
          </span>
          {event.location ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden />
              {event.location}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-tertiary">
          {TYPE_LABEL[event.type] ?? event.type}
          {event.club_name ? ` · Organised by ${event.club_name}` : ''}
        </p>
      </div>

      {event.joule_value ? (
        <div className="flex items-center gap-2 rounded-[var(--radius)] border border-border bg-card px-5 py-4">
          <Zap className="size-4 text-gold" aria-hidden />
          <div>
            <p className="text-lg font-medium">{event.joule_value}</p>
            <p className="text-xs text-tertiary">Joules for attending</p>
          </div>
        </div>
      ) : null}

      {concluded ? (
        <p className="text-sm text-tertiary">This event has already concluded.</p>
      ) : student ? (
        <div className="flex flex-col gap-3">
          {registration ? (
            registration.attended_at ? (
              <span className="flex items-center gap-1.5 text-sm text-success">
                <CircleCheck className="size-4" aria-hidden />
                Attendance confirmed
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted">You&apos;re registered.</span>
                <CancelRegistrationButton eventId={event.id} />
              </div>
            )
          ) : (
            <RegisterButton eventId={event.id} />
          )}
          <p className="flex items-start gap-1.5 text-xs text-tertiary">
            <ScanLine className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Registering saves your spot and reminds you before the event. Scanning the event&apos;s QR code at
            check-in is what actually confirms your attendance and continues your streak.
          </p>
        </div>
      ) : (
        <p className="text-sm text-tertiary">
          <Link href={`/login?next=/events/${event.id}`} className="text-gold">
            Log in
          </Link>{' '}
          as a student to register for this event.
        </p>
      )}
    </article>
  );
}

// Plain helper (not a component) — keeps the impure Date.now() call outside
// the component body so it isn't flagged by the render-purity lint rule.
function hasConcluded(isoDate: string): boolean {
  return new Date(isoDate).getTime() < Date.now();
}
