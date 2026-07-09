import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { NewAfterglowForm } from './form';

export const metadata = { title: 'New Afterglow post' };

export default async function NewAfterglowPage() {
  await requireAdmin(['owner', 'officer']);
  const supabase = await createClient();
  const { data: events } = await supabase
    .from('events')
    .select('id, name, event_date')
    .order('event_date', { ascending: false });

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-lg font-medium">Write an Afterglow post</h1>
      <NewAfterglowForm events={events ?? []} />
    </div>
  );
}
