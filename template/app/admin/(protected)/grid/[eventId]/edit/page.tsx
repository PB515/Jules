import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { EditEventForm } from './form';

export default async function EditEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const admin = await requireAdmin(['professor', 'committee_member']);
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle();
  if (!event) notFound();
  // Same club-scoping as the Grid Station list itself (decision 45) — a
  // Committee Member editing a URL for another club's event should not see it.
  if (admin.role === 'committee_member' && admin.club_id && event.club_id !== admin.club_id) notFound();

  const coverImageUrl = event.cover_image_path
    ? supabase.storage.from('event-covers').getPublicUrl(event.cover_image_path).data.publicUrl
    : null;

  return <EditEventForm event={event} coverImageUrl={coverImageUrl} />;
}
