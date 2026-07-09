import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { TeamClient } from './team-client';

export const metadata = { title: 'Live Round' };

export default async function LiveRoundPlayPage({ params }: { params: Promise<{ roundId: string }> }) {
  const student = await requireStudent();
  const { roundId } = await params;
  const supabase = await createClient();

  const { data: round } = await supabase.from('live_rounds').select('*').eq('id', roundId).maybeSingle();
  if (!round) redirect('/live');

  const { data: team } = await supabase
    .from('live_round_teams')
    .select('team_name')
    .eq('round_id', roundId)
    .eq('student_id', student.id)
    .maybeSingle();
  if (!team) redirect('/live');

  const { data: surge } = await supabase.from('surges').select('points_per_question').eq('id', round.surge_id).single();

  return <TeamClient roundId={roundId} initialRound={round} teamName={team.team_name} pointsPerQuestion={surge?.points_per_question ?? 20} />;
}
