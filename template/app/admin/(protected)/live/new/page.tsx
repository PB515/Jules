import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { EmptyState } from '@/lib/patterns/empty-state';
import { MonitorPlay } from '@/lib/icons';
import { createLiveRoundAction, type ActionResult } from '../actions';
import { NewRoundForm } from './form';

export const metadata = { title: 'Live Round' };

export default async function NewLiveRoundPage() {
  await requireAdmin(['professor', 'super_admin']);
  const supabase = await createClient();
  const { data: surges } = await supabase
    .from('surges')
    .select('id, name, status')
    .order('created_at', { ascending: false });

  const initialState: ActionResult = {};

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-1 text-lg font-medium">Live Round</h1>
      <p className="mb-6 text-sm text-tertiary">
        Host a Kahoot-style round: one question at a time for the whole room, live on your screen.
      </p>

      {!surges || surges.length === 0 ? (
        <EmptyState icon={MonitorPlay} title="No Surges yet" message="Create a Surge with questions first." />
      ) : (
        <NewRoundForm surges={surges} action={createLiveRoundAction} initialState={initialState} />
      )}
    </div>
  );
}
