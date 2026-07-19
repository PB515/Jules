# Runbook — Testing lessons (do's and don'ts)

*Concrete, real gotchas hit while building and using the Playwright/Vitest
test harness (`template/tests/jules/`) — not general testing theory. Each
entry names the actual failure it prevents. Add to this file the moment a
new one surfaces; don't let it go undocumented and get re-discovered later.*

---

## App-code gotchas (things that broke the real feature, not just the test)

**Every new realtime channel needs a catch-up refetch on `SUBSCRIBED`, not just an `.on(...)` handler.**
Supabase Realtime only delivers `postgres_changes` events *after* a channel
reaches `SUBSCRIBED` — a change that happens in the window between mount and
subscription confirmation is missed entirely, with nothing to trigger a
later refresh. Always pass a status callback to `.subscribe()` and refetch
when `status === 'SUBSCRIBED'`:
```ts
.subscribe((status) => {
  if (status === 'SUBSCRIBED') refreshX();
});
```
Found via a genuinely flaky Playwright test on the Phase 1 live-registrations
feature (`registrations-client.tsx`) — passed most of the time, failed when
the mutation fired too soon after page load. **Known gap not yet closed
elsewhere**: `host-client.tsx` and `team-client.tsx` (Live Round) don't have
this guard either — they lean on a mount-time fetch for the *cold-load* case
only, which doesn't cover a change landing in this specific narrow window.
Worth a follow-up pass if Live Round ever shows the same symptom.

**`react-hooks/refs`**: don't put a `useRef(...).current` value directly in a
`useEffect`/`useCallback` dependency array — it's a stable value that never
needs to trigger a recompute, and the newer eslint-plugin-react-hooks rule
flags reading `ref.current` in a dep array as unsafe. Match the existing
`host-client.tsx` pattern: omit it from the deps array, disable
`exhaustive-deps` for that one line, and comment why.

**`eslint-disable-next-line` only disables the *immediately next* line.** A
multi-line explanatory comment between the disable directive and the code it
targets breaks it silently — ESLint reports "unused eslint-disable
directive" instead of an error, easy to miss. Put all explanatory comment
lines *before* the `eslint-disable-next-line` comment, so the disable
directive is the very last line before the code.

---

## Test-design gotchas (things that broke the test, not the app)

**Tests in the same `describe` block that mutate shared fixture state will
race each other under Playwright's default `fullyParallel: true`.** If two
tests both register/unregister against the same event+student, running them
concurrently corrupts each other's expected counts. Either give each test
its own isolated fixture, or serialize: `test.describe.configure({ mode:
'serial' })` as the first line inside the `describe` callback (or at file
top-level if the file has no explicit describe wrapper — same convention
`auth.setup.ts` uses for its login tests).

**A `storageState` snapshot captures every cookie set during that login
flow — including test-only escape hatches.** `student-*.json` was captured
while `auth.setup.ts` visited `/login?devMobileBypass=1` to pass the
mobile-PWA gate; that cookie rides along into every test reusing that
storageState, and will make gate/signal logic pass unconditionally even when
the real check is broken. If a test needs to isolate real signal-based logic
(see `pwa-standalone-gate.student.spec.ts`), explicitly
`context.clearCookies({ name: '...' })` before the first navigation.

**Turbopack dev-server first-compile latency on an untouched route can push
a single assertion past a short timeout** — looks exactly like a flaky
real bug (a button stuck on "Loading…", an element that "isn't there yet")
but resolves itself once the route is warm. `playwright.config.ts` already
sets a global 15s `expect`/`actionTimeout` for this reason — don't shrink it
back down chasing perceived speed.

**Supabase Auth has its own per-IP sign-in rate limit, separate from this
app's in-app `rateLimit()` check.** Several simultaneous `signInWithPassword`
calls (e.g. 5 parallel `auth.setup.ts` logins) can trip it intermittently,
surfacing as a generic "Incorrect email or password" — indistinguishable
from a real bad password without checking whether the same credentials
worked moments earlier. `auth.setup.ts` runs its logins serial, not
parallel, for exactly this reason.

**Diagnose network flakiness before assuming it's a real bug or retrying
blindly.** A `ConnectTimeoutError` reaching Supabase mid-test-run was real,
external network sluggishness on the machine (confirmed via a direct `curl`
to the auth endpoint — reachable, just slow) — not a code problem. Confirm
with an independent check before spending cycles "fixing" something that
isn't broken. Reusing already-saved `storageState` files (`--no-deps`) to
skip a flaky login step entirely is a legitimate way to keep debugging
moving while network issues are transient.

**A manually-written `.env.local` parser using a regex with `$`-anchors can
silently fail to match a real line for reasons that don't reproduce in
isolation.** Hit once with `DATABASE_URL` specifically (root cause never
fully pinned down). The robust fix: don't use a regex at all — split on the
first `=` manually:
```ts
const eq = trimmed.indexOf('=');
const key = trimmed.slice(0, eq);
const value = trimmed.slice(eq + 1);
```
`tests/jules/db-helpers.ts`'s own `loadEnv()` and `playwright.config.ts` both
use `process.loadEnvFile()` (Node ≥20.6's native loader) instead precisely
to avoid hand-rolling this — prefer that over a manual regex/split loader in
any new disposable script too.

---

## Process discipline (how to actually trust a test)

**A new regression test only proves something once it's been watched to
fail.** Passing tests on a mature, already-hand-verified codebase mostly
just re-confirm what was already believed — they don't prove the test would
catch a *future* regression. Before trusting a new test: deliberately break
the exact logic it targets, confirm the test fails, then revert and confirm
it passes again. Every scenario in this project's test suite has had this
done at least once (see `cheerful-swimming-curry.md`'s "Status: initiative
complete" section for the full record, including which breaks needed a
manual SQL Editor step because Claude Code's own auto-mode classifier
hard-blocks scripted mutations to live authorization functions/schema
constraints on the shared hosted DB — even with explicit in-chat
authorization).

**Verify through the test harness, not by manually driving a browser.** The
entire point of building this harness was to stop spending tokens on
hand-driven browser verification — reach for `npm run test:e2e` /
`npx playwright test <file>` / `npm test` first. Manual Browser-pane
verification is for genuinely one-off visual checks the harness doesn't
(yet) cover, not a substitute for a real scenario.
