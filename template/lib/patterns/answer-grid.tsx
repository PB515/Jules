'use client';
/**
 * The Kahoot-style 2x2 answer grid — shared by async Surge Mode
 * (surge-client.tsx) and Live Round (team-client.tsx), which previously each
 * rendered a single-column stacked list with no per-option color or shape.
 * Each of the 4 options always gets the same fixed color+shape pair,
 * regardless of which question is showing, so the mapping never shifts:
 * A = teal triangle, B = blue diamond, C = violet circle, D = gold square.
 *
 * Deliberately generic about *why* an option is selected/correct/wrong —
 * the two call sites have genuinely different reveal timing (async Surge
 * reveals its own correct/wrong the instant an answer locks; Live Round
 * hides correct/wrong until the host's own "Reveal answer" click, decision
 * 73's suspense fix) — so the caller computes each cell's `AnswerState`
 * itself rather than this component owning any reveal-timing logic.
 */
export type AnswerKey = 'A' | 'B' | 'C' | 'D';
export type AnswerState = 'neutral' | 'selected' | 'correct' | 'wrong';

const SHAPE: Record<AnswerKey, { glyph: string; color: string }> = {
  A: { glyph: '▲', color: 'var(--adani-teal)' },
  B: { glyph: '◆', color: 'var(--adani-blue)' },
  C: { glyph: '●', color: 'var(--adani-violet)' },
  D: { glyph: '■', color: 'var(--gold)' },
};

export function AnswerGrid({
  options,
  getState,
  onSelect,
  disabled,
  indicator,
}: {
  options: [AnswerKey, string][];
  getState: (key: AnswerKey) => AnswerState;
  onSelect: (key: AnswerKey) => void;
  disabled: boolean;
  /** Optional per-cell icon for correct/wrong states — color alone shouldn't
   *  carry that meaning, matching this app's existing accessibility discipline
   *  (e.g. the streak chain always pairs color with a real count). */
  indicator?: (state: AnswerState) => React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map(([key, label]) => {
        const state = getState(key);
        const shape = SHAPE[key];

        let borderColor = 'var(--border)';
        let background = 'var(--card)';
        if (state === 'selected') borderColor = shape.color;
        else if (state === 'correct') borderColor = 'var(--success)';
        else if (state === 'wrong') {
          borderColor = 'var(--accent)';
          background = 'var(--tier-current-bg)';
        }

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            disabled={disabled}
            className="flex h-28 flex-col justify-between rounded-[var(--radius)] border-2 px-3.5 py-3 text-left transition-colors disabled:cursor-default"
            style={{ borderColor, background }}
          >
            <span className="flex items-center justify-between">
              <span
                className="flex size-7 items-center justify-center rounded-md text-xs font-bold text-white"
                style={{ background: shape.color }}
                aria-hidden
              >
                {shape.glyph}
              </span>
              {indicator ? indicator(state) : null}
            </span>
            <span className="text-sm leading-tight font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
