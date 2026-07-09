import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { EmptyState } from '@/lib/patterns/empty-state';
import { Zap } from '@/lib/icons';
import { BuilderClient } from './builder-client';

export const metadata = { title: 'Surge Builder' };

export default async function SurgeBuilderPage({ params }: { params: Promise<{ surgeId: string }> }) {
  await requireAdmin(['owner', 'officer']);
  const { surgeId } = await params;
  const supabase = await createClient();

  const { data: surge } = await supabase.from('surges').select('*').eq('id', surgeId).maybeSingle();
  if (!surge) {
    return (
      <div className="p-6">
        <EmptyState icon={Zap} title="Surge not found" />
      </div>
    );
  }

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('surge_id', surgeId)
    .order('order_index', { ascending: true });

  return (
    <div className="mx-auto max-w-3xl p-6">
      <BuilderClient surge={surge} questions={questions ?? []} />
    </div>
  );
}
