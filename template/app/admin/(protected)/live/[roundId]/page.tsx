import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { HostClient } from './host-client';

export const metadata = { title: 'Live Round' };

export default async function LiveRoundHostPage({ params }: { params: Promise<{ roundId: string }> }) {
  await requireAdmin(['professor', 'committee_member']);
  const { roundId } = await params;
  const supabase = await createClient();

  const { data: round } = await supabase.from('live_rounds').select('*').eq('id', roundId).maybeSingle();
  if (!round) notFound();

  const [{ data: surge }, { data: questions }] = await Promise.all([
    supabase.from('surges').select('name, points_per_question').eq('id', round.surge_id).single(),
    supabase
      .from('questions')
      .select('id, text, option_a, option_b, option_c, option_d, correct_option, time_limit_seconds')
      .eq('surge_id', round.surge_id)
      .order('order_index'),
  ]);

  return (
    <HostClient
      initialRound={round}
      surgeName={surge?.name ?? ''}
      pointsPerQuestion={surge?.points_per_question ?? 20}
      questions={questions ?? []}
    />
  );
}
