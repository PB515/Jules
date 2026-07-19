/**
 * Generic "rows to CSV, trigger a browser download" utility — separate from
 * lib/jules/csv.ts, which is entirely about question-import parsing, a
 * different concern. RFC4180-ish escaping: quote a field only when it
 * actually contains a comma, quote, or newline, doubling any embedded quotes.
 */
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(','));
  return lines.join('\r\n');
}

/** Client-only — triggers a real browser download via a temporary object URL. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
