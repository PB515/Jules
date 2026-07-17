'use client';
/**
 * Universal club-rules FAQ — identical on every club's page (see
 * docs/club-detail-pages-spec.md). Hardcoded here, not stored in the DB,
 * since it never varies per club and isn't something a professor edits per
 * club — same pattern as this codebase's other static label maps.
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp } from '@/lib/icons';

const RULES: { question: string; answer: string }[] = [
  {
    question: 'How do I join a club?',
    answer:
      'Submit a membership application form circulated by the Program Office, FMS. The club’s faculty mentor may run a selection process (interviews, written statements, or group discussions) to evaluate candidates. You’ll be notified as accepted, waitlisted, or declined after the deadline.',
  },
  {
    question: "How many members does a club have, and who's eligible?",
    answer:
      'Each club has exactly 10 student members (not counting the faculty mentor): 5 from first year, 5 from second year. Every MBA student at FMS is eligible to apply, though some clubs may weigh interest or relevant experience. You can only be a member of one club at a time.',
  },
  {
    question: 'Who has the final say on club activities?',
    answer:
      "The club's faculty mentor has final decision-making authority over all club activities, site visits, field visits, and student participation. For selection decisions, the Faculty Chair's decision is final.",
  },
  {
    question: "What's expected of members?",
    answer:
      "Attend meetings regularly, actively participate in club activities, contribute positively to the club's goals, and follow club rules. One or two members are nominated, alongside the faculty mentor, to document the club's events and activities.",
  },
  {
    question: 'Can membership be taken away?',
    answer:
      "Yes, for consistently breaking club rules, unethical conduct in the club's name, disruptive behavior, or failing to meet membership responsibilities.",
  },
  {
    question: 'Are there leadership roles within a club?',
    answer:
      "Yes, members can take on roles like President, Vice President, Treasurer, or Event Coordinator, typically through annual elections or nominations per the club's own structure.",
  },
];

export function RulesAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted">Club rules</h2>
      <div className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
        {RULES.map((rule, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={rule.question}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm"
                aria-expanded={isOpen}
              >
                <span>{rule.question}</span>
                {isOpen ? (
                  <ChevronUp className="size-4 shrink-0 text-tertiary" aria-hidden />
                ) : (
                  <ChevronDown className="size-4 shrink-0 text-tertiary" aria-hidden />
                )}
              </button>
              {isOpen ? <p className="px-4 pb-3 text-sm text-muted">{rule.answer}</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
