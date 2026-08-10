/**
 * A deterministic short-date formatter for CLIENT COMPONENTS only. Plain
 * `new Date(x).toLocaleDateString()` picks up the *runtime's* locale and
 * timezone — during SSR that's the server's (often UTC, `en-US`-ish), during
 * hydration it's the visitor's browser — so the same call can render two
 * different strings and React throws a hydration mismatch. Pinning both
 * locale and timeZone makes the server and the client always agree.
 * Server Components don't have this risk (they never re-run client-side),
 * so plain toLocaleDateString() is fine there.
 *
 * Pinned to 'Asia/Kolkata', not 'UTC' — every real admin/student is in
 * India, and event_date/end_date are now stored as the correct UTC instant
 * for the IST wall-clock time an admin actually typed (see
 * `toUtcFromIst` in app/admin/(protected)/grid/actions.ts). Displaying in
 * UTC here would silently show a different clock time than what was typed
 * — any fixed IANA zone solves the original hydration-mismatch problem,
 * so this one was picked because it also matches real-world IST. The
 * function names keep the old "UTC" suffix rather than triggering a
 * 14-file rename for what's otherwise a pure internal-value fix.
 */
export function formatDateUTC(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

export function formatTimeUTC(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}
