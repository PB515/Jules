import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { NewSurgeForm } from './form';

export default async function NewSurgePage() {
  const admin = await requireAdmin(['professor', 'committee_member', 'super_admin']);
  const supabase = await createClient();

  // A club-scoped Professor or Committee Member can only ever create a
  // Surge for their own club — no point offering a picker with clubs they
  // couldn't actually save against (the RLS policy would reject it anyway).
  let query = supabase.from('clubs').select('id, name').order('name');
  if ((admin.role === 'professor' || admin.role === 'committee_member') && admin.club_id) {
    query = query.eq('id', admin.club_id);
  }
  const { data: clubs } = await query;

  return <NewSurgeForm clubs={clubs ?? []} />;
}
