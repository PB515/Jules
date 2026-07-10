/**
 * Thin wrapper around the Vibration API. No-ops everywhere it isn't
 * supported (iOS Safari never implements it, desktop browsers don't either)
 * so call sites never need their own feature check.
 */
export function vibrate(pattern: number | number[]) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  navigator.vibrate(pattern);
}
