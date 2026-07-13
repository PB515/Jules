import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { SurgeClient } from './surge-client';
import { GroupRegistrationClient } from './group-registration-client';
import { EmptyState } from '@/lib/patterns/empty-state';
import { Zap } from '@/lib/icons';

export const metadata = { title: 'Surge' };

export default async function SurgePage({ params }: { params: Promise<{ surgeId: string }> }) {
  const student = await requireStudent();
  const { surgeId } = await params;
  const supabase = await createClient();

  const { data: surge } = await supabase.from('surges').select('*').eq('id', surgeId).maybeSingle();
  if (!surge) {
    return (
      <div className="px-5 pt-8">
        <EmptyState icon={Zap} title="Surge not found" />
      </div>
    );
  }
  if (surge.status === 'complete') redirect(`/surge/${surgeId}/matrix`);
  if (surge.status === 'draft') {
    const [{ data: groups }, { data: members }] = await Promise.all([
      supabase.from('quiz_groups').select('id, name').eq('surge_id', surgeId),
      supabase
        .from('quiz_group_members')
        .select('group_id, student_id, students(name)')
        .eq('surge_id', surgeId)
        .returns<{ group_id: string; student_id: string; students: { name: string } | null }[]>(),
    ]);

    const myMembership = (members ?? []).find((m) => m.student_id === student.id);
    const myGroup = myMembership
      ? {
          id: myMembership.group_id,
          name: (groups ?? []).find((g) => g.id === myMembership.group_id)?.name ?? '',
          members: (members ?? [])
            .filter((m) => m.group_id === myMembership.group_id)
            .map((m) => m.students?.name ?? '?'),
        }
      : null;
    const openGroups = (groups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      memberCount: (members ?? []).filter((m) => m.group_id === g.id).length,
    }));

    return (
      <div className="flex flex-col gap-6 px-5 pt-8">
        <EmptyState icon={Zap} title="Not live yet" message="This Surge hasn't started. Check back when it goes live." />
        <GroupRegistrationClient surgeId={surgeId} myGroup={myGroup} openGroups={openGroups} />
      </div>
    );
  }

  // Pre-fetch the full question set ONCE (spec §11) — never per-question polling.
  const { data: questions, error } = await supabase.rpc('start_surge', { p_surge_id: surgeId });
  if (error) {
    return (
      <div className="px-5 pt-8">
        <EmptyState icon={Zap} title="Could not load the Surge" message={error.message} />
      </div>
    );
  }

  const unanswered = (questions ?? []).filter((q) => !q.already_answered);
  if (unanswered.length === 0) {
    return (
      <div className="px-5 pt-8">
        <EmptyState icon={Zap} title="Already answered" message="You've completed every question in this Surge. Results land once it closes." />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-5 pt-8">
      <SurgeClient surgeId={surgeId} questions={unanswered} />
    </div>
  );
}
