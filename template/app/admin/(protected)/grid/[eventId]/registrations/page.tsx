import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { getEventRegistrations } from '@/lib/jules/event-registrations';
import { RegistrationsClient } from './registrations-client';

export const metadata = { title: 'Registrations' };

export default async function RegistrationsPage({ params }: { params: Promise<{ eventId: string }> }) {
  // Professor + Super Admin only (not Committee Member) — this view joins
  // student name/email/phone, granted by the narrow
  // "staff reads registered students for own club events" RLS policy
  // (0038), scoped to events the caller can manage. A Committee Member has
  // no students-read policy at all, so the join would silently come back
  // empty for them anyway — matches the actual ask, not an arbitrary cut.
  await requireAdmin(['professor', 'super_admin']);
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase.from('events').select('id, name, event_date, location').eq('id', eventId).maybeSingle();
  if (!event) notFound();

  const initialRegistrations = await getEventRegistrations(supabase, eventId);

  return <RegistrationsClient eventId={event.id} eventName={event.name} initialRegistrations={initialRegistrations} />;
}
