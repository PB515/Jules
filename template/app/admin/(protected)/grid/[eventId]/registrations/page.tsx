import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { RegistrationsClient } from './registrations-client';

export const metadata = { title: 'Registrations' };

export default async function RegistrationsPage({ params }: { params: Promise<{ eventId: string }> }) {
  // Professor-only (not Committee Member) — this view joins student
  // name/email/phone, and only "professor reads all students (vault)"
  // grants that; a Committee Member has no broad students-read policy at
  // all, so the join would silently come back empty for them anyway. This
  // matches the professor's actual ask, not an arbitrary restriction.
  await requireAdmin(['professor']);
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase.from('events').select('id, name, event_date, location').eq('id', eventId).maybeSingle();
  if (!event) notFound();

  const { data: registrations } = await supabase
    .from('event_registrations')
    .select('id, registered_at, attended_at, students(name, college_email, phone)')
    .eq('event_id', eventId)
    .order('registered_at', { ascending: false });

  return (
    <RegistrationsClient
      eventId={event.id}
      eventName={event.name}
      initialRegistrations={
        (registrations ?? []).map((r) => ({
          id: r.id,
          registered_at: r.registered_at,
          attended_at: r.attended_at,
          name: r.students?.name ?? 'Unknown',
          college_email: r.students?.college_email ?? '',
          phone: r.students?.phone ?? null,
        })) ?? []
      }
    />
  );
}
