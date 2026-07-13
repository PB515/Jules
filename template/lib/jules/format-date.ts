/**
 * A deterministic short-date formatter for CLIENT COMPONENTS only. Plain
 * `new Date(x).toLocaleDateString()` picks up the *runtime's* locale and
 * timezone — during SSR that's the server's (often UTC, `en-US`-ish), during
 * hydration it's the visitor's browser — so the same call can render two
 * different strings and React throws a hydration mismatch. Pinning both
 * locale and timeZone makes the server and the client always agree.
 * Server Components don't have this risk (they never re-run client-side),
 * so plain toLocaleDateString() is fine there.
 */
export function formatDateUTC(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function formatTimeUTC(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
}
