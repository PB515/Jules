/**
 * Which questions get the "escalating drama" reveal treatment (drumroll +
 * suspense hold before showing the answer) in Live Round, shared between the
 * host screen and the student play screen so they stay in lockstep.
 *
 * The final question always gets it. Longer rounds also get a beat at the
 * halfway and three-quarter marks — on a short round (under
 * MIN_QUESTIONS_FOR_EXTRA_MILESTONES questions) those would land too close
 * to the final question to read as a distinct moment, so only the final
 * question gets the treatment there.
 */
export type QuizMilestone = 'half' | 'three-quarter' | 'last';

const MIN_QUESTIONS_FOR_EXTRA_MILESTONES = 8;

export const MILESTONE_LABEL: Record<QuizMilestone, string> = {
  half: 'Halfway there',
  'three-quarter': 'Final stretch',
  last: 'Final question',
};

export function getQuizMilestone(index: number, total: number): QuizMilestone | null {
  if (index === total - 1) return 'last';
  if (total < MIN_QUESTIONS_FOR_EXTRA_MILESTONES) return null;
  if (index === Math.ceil(total * 0.75) - 1) return 'three-quarter';
  if (index === Math.ceil(total * 0.5) - 1) return 'half';
  return null;
}
