import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { NewEventForm } from './form';

export default async function NewEventPage() {
  const admin = await requireAdmin(['professor', 'committee_member']);
  const supabase = await createClient();

  // Same reasoning as the New Surge form: a Committee Member can only ever
  // create an event for their own club (decision 45).
  let query = supabase.from('clubs').select('id, name').order('name');
  if (admin.role === 'committee_member' && admin.club_id) {
    query = query.eq('id', admin.club_id);
  }
  const { data: clubs } = await query;

  return <NewEventForm clubs={clubs ?? []} />;
}
