import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { getEventRegistrations } from '@/lib/jules/event-registrations';
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

  const initialRegistrations = await getEventRegistrations(supabase, eventId);

  return <RegistrationsClient eventId={event.id} eventName={event.name} initialRegistrations={initialRegistrations} />;
}
