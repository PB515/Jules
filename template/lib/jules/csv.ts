/**
 * CSV question import — the exact schema frozen in docs/project-spec.md §9:
 *   question,option_a,option_b,option_c,option_d,correct_option,time_limit_seconds,tag
 * Duplicate question text and out-of-range time limits are FLAGGED, not
 * rejected (imported anyway, admin reviews before the Surge goes live).
 */

export interface ParsedRow {
  line: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  time_limit_seconds: number;
  time_limit_flagged: boolean;
  tag: string;
  errors: string[];
  duplicate: boolean;
}

const HEADER = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'time_limit_seconds', 'tag'];

/** Minimal RFC4180-ish CSV line splitter — handles quoted fields with commas. */
function parseCsvLines(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

export function parseQuestionsCsv(text: string): { rows: ParsedRow[]; headerError?: string } {
  const lines = parseCsvLines(text);
  if (lines.length === 0) return { rows: [], headerError: 'The file is empty.' };

  const header = lines[0].map((h) => h.trim().toLowerCase());
  const looksLikeHeader = HEADER.every((h) => header.includes(h));
  const dataLines = looksLikeHeader ? lines.slice(1) : lines;

  const seen = new Set<string>();
  const rows: ParsedRow[] = dataLines.map((cells, idx) => {
    const [question, a, b, c, d, correctRaw, timeRaw, tag] = cells;
    const errors: string[] = [];

    const q = (question ?? '').trim();
    if (!q) errors.push('question is required');
    if (q.length > 280) errors.push('question exceeds 280 characters');

    for (const [label, val] of [
      ['option_a', a],
      ['option_b', b],
      ['option_c', c],
      ['option_d', d],
    ] as const) {
      if (!val || !val.trim()) errors.push(`${label} is required`);
      else if (val.length > 80) errors.push(`${label} exceeds 80 characters`);
    }

    const correct = (correctRaw ?? '').trim().toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(correct)) errors.push('correct_option must be A, B, C, or D');

    let timeLimit = 15;
    let timeFlagged = false;
    const timeTrim = (timeRaw ?? '').trim();
    if (timeTrim) {
      const n = parseInt(timeTrim, 10);
      if (Number.isNaN(n)) errors.push('time_limit_seconds must be a number');
      else {
        timeLimit = n;
        if (n < 5 || n > 120) timeFlagged = true; // flagged, not rejected (spec §9)
      }
    }

    const key = q.toLowerCase();
    const duplicate = seen.has(key) && key.length > 0;
    seen.add(key);

    return {
      line: idx + (looksLikeHeader ? 2 : 1),
      question: q,
      option_a: (a ?? '').trim(),
      option_b: (b ?? '').trim(),
      option_c: (c ?? '').trim(),
      option_d: (d ?? '').trim(),
      correct_option: correct,
      time_limit_seconds: timeLimit,
      time_limit_flagged: timeFlagged,
      tag: (tag ?? '').trim(),
      errors,
      duplicate,
    };
  });

  return { rows };
}
