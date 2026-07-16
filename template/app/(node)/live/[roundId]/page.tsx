import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { TeamClient } from './team-client';
import { TeamFormationClient } from './team-formation-client';

export const metadata = { title: 'Live Round' };

interface MembershipRow {
  team_id: string;
  live_round_teams: { team_name: string } | null;
}

export default async function LiveRoundPlayPage({ params }: { params: Promise<{ roundId: string }> }) {
  const student = await requireStudent();
  const { roundId } = await params;
  const supabase = await createClient();

  const { data: round } = await supabase.from('live_rounds').select('*').eq('id', roundId).maybeSingle();
  if (!round) redirect('/live');

  const { data: membership } = await supabase
    .from('live_round_team_members')
    .select('team_id, live_round_teams(team_name)')
    .eq('round_id', roundId)
    .eq('student_id', student.id)
    .maybeSingle()
    .returns<MembershipRow | null>();

  if (!membership) {
    // Teams can only be formed/joined before the round starts (mirrors
    // async Surge Mode's "groups can only be joined beforehand" rule).
    if (round.phase !== 'lobby') redirect('/live');

    const [{ data: teams }, { data: members }] = await Promise.all([
      supabase.from('live_round_teams').select('id, team_name').eq('round_id', roundId),
      supabase
        .from('live_round_team_members')
        .select('team_id')
        .eq('round_id', roundId)
        .returns<{ team_id: string }[]>(),
    ]);
    const openTeams = (teams ?? []).map((t) => ({
      id: t.id,
      name: t.team_name,
      memberCount: (members ?? []).filter((m) => m.team_id === t.id).length,
    }));

    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        <TeamFormationClient roundId={roundId} roomCode={round.room_code} openTeams={openTeams} />
      </main>
    );
  }

  const [{ data: surge }, { count: totalQuestions }] = await Promise.all([
    supabase.from('surges').select('points_per_question').eq('id', round.surge_id).single(),
    supabase.from('questions').select('id', { count: 'exact', head: true }).eq('surge_id', round.surge_id),
  ]);

  return (
    <TeamClient
      roundId={roundId}
      initialRound={round}
      teamName={membership.live_round_teams?.team_name ?? ''}
      pointsPerQuestion={surge?.points_per_question ?? 20}
      totalQuestions={totalQuestions ?? 0}
    />
  );
}
