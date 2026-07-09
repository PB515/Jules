# CLAUDE.md — Jules

*The context anchor for this site. Read first every session. Keep Status and the Build Log current at the end of every phase.*

---

## What this is

A mobile-first Progressive Web App for "Jules," a college energy-management club. It turns club participation (meetings, expert sessions, volunteer tasks, live quizzes) into a gamified engagement system — "Joules" earned via QR check-in and quiz ("Surge") participation, standing tiers (Ember → Volt → Current → Plasma), and a permanent archive ("Catalyst Records"). Two sides: the student "Node" experience and the admin "Reactor Command Center" (role-scoped: Owner/President, Officer, Event Volunteer). This is an **authenticated app with private per-user data** — the portal golden path applies, security-first.

Full concept + already-decided product/technical detail: [`docs/project-spec.md`](docs/project-spec.md) (the canonical, merged V3+V4 spec — treat as both the substance/strategy authority; there is no separate competitor-research doc since this isn't a commercial business). Historical: [`docs/project-spec-v4-addendum.md`](docs/project-spec-v4-addendum.md) (superseded by project-spec.md, kept for reference only).

## Current status

- **Phase:** 1 of 6 — Foundation, built AND verified end-to-end against a live, hosted Supabase project (skipped the doc-generation step at the user's explicit direction — see resume note).
- **Last completed:** Full security-first build, then wired to a real hosted Supabase project (`xonqlqcqhxmtvbrjhhkk`, region `ap-northeast-1`/Tokyo — ★ see Known open items, an Indian college should likely be `ap-south-1`/Mumbai instead). All 9 migrations applied clean. First Owner admin bootstrapped. Live-verified: Owner admin login (`/admin/login` → `/admin` System Ledger, real empty states), student signup → onboarding → dashboard (`/signup` → `/dashboard`, real name/tier/season-countdown rendering from the DB). Found and fixed a real redirect-loop bug in the process (decision 20). Pushed to `git@github.com:PB515/Jules.git` (`main`).
- **Next up:** Vercel deployment (the user's stated order was git → Supabase → Vercel; git and Supabase are done). Then: real college domain + season calendar, import the starter question bank into a live Surge, a real scannable QR image.
- **Last commit:** `e07eec4` "Build Phase 1 foundation..." on `main`, pushed to `origin`. One more commit pending for the redirect-loop fix (decision 20) + this update.
- **Resume note:** The user interrupted the planned doc-gen step (docs 01–11 + App PRD + Data Model & Security) and asked instead to just build the whole app, using sound judgment on anything ambiguous rather than stopping to ask, and to build everything locally even without real secrets/Docker so values could be pasted in afterward. That's what happened — no docs 01–11 exist, only this file + the two runbooks. If you want the doc set after all, it can still be generated from `docs/project-spec.md` per `docs/doc-gen-master.md`. **What changed since the first pass: everything below the code was reviewed-but-unverified (no Docker, no live DB). It's now actually verified** — real hosted Postgres, real migrations applied, real signup/login exercised in a browser, not just reasoned through. The `pgcrypto` `hmac()` call in decision 16 needed a fix once it hit a real Postgres (text args need explicit `bytea` casts, and `extensions` schema needed adding to the function's `search_path` — hosted Supabase installs `pgcrypto` there, not `public`). A local `.env.local` (gitignored) holds the real project's keys + a direct Postgres connection string; nobody should need Docker for this project going forward since there's already a shared hosted dev project.

## Stack

Next.js 16 App Router (Turbopack) · Tailwind v4 + tokens · Supabase (4-client split + RLS) · Vercel. PWA scaffold (`app/manifest.ts`, `public/sw.js`, `lib/pwa/register-sw.tsx`) wired to real Jules branding/colors.

## Conventions

Tokens only — no hardcoded hex · secrets in `.env.local` only · no new/upgraded deps without asking · git per phase, branch per phase · changing a frozen doc is a separate logged step. Full list: `docs/conventions.md`.

## Decisions made (do not revisit)

*Decisions 1–10 are pulled directly from `docs/project-spec.md`'s own "Decisions Resolved" (§9) plus earlier sections that already fixed a shape. Decisions 11+ are judgment calls made during the build where the spec was silent or self-contradictory, since the user asked for the build to proceed without stopping to ask — each is logged here, in code comments at the point of decision, and is a deliberate, loggable action to revisit if wrong.*

1. **Visual direction = "solar blue"** — full hex token table in spec §3. Set in `template/app/globals.css` (includes tier colors + the motion keyframes from §3).
2. **Tier system** — Ember (0–299) / Volt (300–599) / Current (600–999) / Plasma (1,000+), computed from `season_joules`, never stored. Spec §1/§4.
3. **Joule lifecycle** — `lifetime_joules` never resets; `season_joules` drives tier + leaderboard and resets on season end. Season cadence is admin-configurable (`Season` record: `start_date`/`end_date`/`cadence`), not hardcoded. Spec §2/§5.
4. **RBAC** — Owner/President (everything incl. Force Reset + Student Data Vault), Officer (Grid Management + Surge Builder, not the Vault), Event Volunteer (QR Scan Station only, scoped to one event, access auto-expires when it ends). Spec §7.
5. **JouleTransaction is the ledger of record** — season/lifetime totals are derived by summing it (also the audit trail), never a mutated balance column. Spec §5/§11.
6. **CSV question-import schema is final**: `question,option_a,option_b,option_c,option_d,correct_option,time_limit_seconds,tag`. Starter bank at `docs/starter-question-bank.csv` — not yet wired into a seed migration (it's real content, not a fixture, so import it through the Surge Builder's own CSV importer once there's a real Surge to attach it to).
7. **QR anti-abuse defaults** — token rotates every 90s during a live event; scan window is 15min before/after the scheduled time; geofence 150m as a **soft flag for admin review**, not a hard block; one scan per student per event. Spec §9. **Hardened beyond the spec's literal words**: spec says the repeat-scan check is "rejected client-side" — this build also enforces it server-side (a partial unique index on `joule_transactions`), since client-side-only would be a real hole in a security-first app.
8. **Concurrency plan for Surges** — pre-fetch the full question set once per Surge entry (no per-question polling); write answers to an append-only queue, not a locking balance update; compute the Surge Matrix reveal as one aggregation pass after the Surge closes, not live per-answer; rate-limit per student. Sized for 500 concurrent joiners within a 10s window (not load-tested — Postgres + RPC design supports it, but this environment can't spin up 500 concurrent clients to prove it). Spec §11.
9. **★ Season calendar — PLACEHOLDER, not real.** Seeded in `0007_jules_seed.sql` as two clearly-labeled placeholder rows (Even/Winter 2025-26, Odd/Monsoon 2026) so "today" always lands inside one. Replace via Institution Settings before the first real season.
10. **★ College email domain — PLACEHOLDER, not real.** `allowed_domains` (text array on `institution_settings`, singleton row), regex-equivalent-checked via `is_email_domain_allowed()`, editable from Institution Settings. Seeded to `yourcollege.edu`.
11. **`season_joules`/`lifetime_joules` are computed, not stored columns** — spec §5 lists them as Student fields, but §5/§11 also insists the ledger is the only source of truth ("never a mutated balance column" — decision 5). Those two statements conflict if taken as "store AND derive"; the stronger, more explicit rule wins. Resolved as SQL functions (`student_season_joules`, `student_lifetime_joules`) computed on read. Logged as a self-consistency fix, not a silent pick.
12. **Surge scoring is a flat `points_per_question` per Surge (default 20), not speed-weighted.** The spec never assigns a number to a correct Surge answer, only to event scans (10/25/50). A flat value was chosen because the spec's own Phase-2 tiebreaker ("average answer time, then earliest completion") only makes sense if raw totals tie often — which requires flat, not speed-scaled, scoring. Tunable per Surge at creation.
13. **Streak rule** (spec has `streak_days`/`last_active_date` fields but never defines the mechanic): increments once per calendar day on any Joule-earning action (event scan or correct Surge answer); no action for a full day resets it to 1 on the next action (not to 0 — it restarts the count rather than zeroing until next earn). Implemented in `_bump_streak()`.
14. **RBAC granularity the spec doesn't spell out**: `admin_manual_adjustment` and `role_change` (both named in the `AuditLogEntry.action` enum) are Owner-only, matching the Vault being Owner-exclusive. Officers cannot adjust Joules or change roles.
15. **A real cross-user data leak was found and fixed during the build**, not after: `student_season_joules()`/`student_lifetime_joules()` were initially left with Postgres's default PUBLIC execute grant, meaning any authenticated client could call them via RPC with an arbitrary student UUID and read someone else's private Joule totals. Fixed by revoking public execute on both and making `my_totals()` (the only legitimate caller for a student's own data) `SECURITY DEFINER` so it can still reach them internally while direct client calls are denied. This is exactly the class of bug the golden path's cross-user-denial gate exists to catch — logged here since it was caught by re-reading the migrations, not by running the gate against a live app (that gate still needs to be run for real once Docker is available).
16. **QR token is a deterministic HMAC over a 90-second time epoch, not a stored/mutable column.** Spec §5 lists `qr_code_token`/`qr_token_expires_at` as Event fields; this build computes the current token from `hmac(event_id || epoch, secret)` instead, so there's no cron to rotate it and no write contention across serverless instances — strictly stronger than the literal field design. `pgcrypto` + a server-only `app_secrets` table back it.
17. **Account recovery uses Supabase's built-in `resetPasswordForEmail` (an email magic-link) instead of a hand-rolled 6-digit OTP table.** Same user-facing shape the spec describes ("Lost connection?" → email → new password), fewer moving parts to get wrong.
18. **No QR-scanning camera library and no QR-image-rendering library were added** (the one-dependency rule: no new deps without asking). Instead: the QR the Grid Station displays encodes a deep link (`/scan?e=<event>&t=<token>`) that a student's native camera app opens directly — no in-app decoder needed — and the Station shows the current code as large text + a copyable link rather than a rendered QR image. Fully functional and testable end-to-end; wiring an actual scannable QR image is a flagged follow-up needing a one-line dependency decision (either vendor a small QR encoder or add a package).
19. **First Owner admin is bootstrapped via a standalone script** (`scripts/bootstrap-owner.ts`, run once via `npm run bootstrap:owner <email> <name>`), since the in-app admin-creation RPC is itself Owner-gated — a deliberate chicken-and-egg break, not an oversight. See `docs/runbooks/jules-setup.md`.
20. **`/admin/login` must never sit inside the auth-guarded admin layout** — it originally did (`app/admin/layout.tsx` wrapped every route under `app/admin/*`, including `login/`), so an unauthenticated visit to `/admin/login` hit `requireAdmin()`, got redirected back to `/admin/login`, and looped forever (`ERR_TOO_MANY_REDIRECTS`, caught live while verifying against the real DB, not by inspection). Fixed by moving every guarded route into `app/admin/(protected)/*` (a route group, same URLs) and leaving `app/admin/login/page.tsx` as an unguarded sibling. Applies generally: an auth guard's own login page can never live inside the layout that guard protects.

## Where things live

- Product/technical spec (source of truth) → `docs/project-spec.md`
- Starter question content → `docs/starter-question-bank.csv` (not yet imported — see decision 6)
- Golden path (security-first order for this app type) → `docs/golden-paths/portal.md`
- Local setup, in order → `docs/runbooks/jules-setup.md` **(read this first to actually run the app)**
- Tokens → `template/app/globals.css`
- Brand/contact + placeholder constants → `template/lib/site.ts`
- Schema + RLS + RPCs → `template/db/migrations/0003`–`0009` (0001/0002 are IDP template boilerplate, untouched)
- Generated DB types (hand-written placeholder — see runbook) → `template/lib/supabase/database.types.ts`
- Auth/session helpers → `template/lib/auth/session.ts`
- Route protection → `template/proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`)
- Node (student) routes → `template/app/(node)/*`, auth routes → `template/app/(auth)/*`, admin → `template/app/admin/login` (unguarded) + `template/app/admin/(protected)/*` (guarded, decision 20)
- Tier/CSV/QR domain logic → `template/lib/jules/*`
- First-Owner bootstrap → `scripts/bootstrap-owner.ts`
- Project docs 01–11 (not generated — see Resume note) → `docs/`

## Known open items (do not invent)

- Real college email domain(s) for `allowed_domains` (decision 10).
- Real registrar season/term dates (decision 9).
- Real club membership size, to confirm the 500-concurrent sizing assumption (spec §11) still holds.
- Push notification service choice — explicitly deferred to Phase 4, non-blocking.
- **★ Supabase project region is `ap-northeast-1` (Tokyo), not `ap-south-1` (Mumbai).** Flagged to the user live during setup (Jules is very likely an Indian college per the Vishwambhari Stuti reference — decision 9). User chose to keep Tokyo for now. Region is cheap to set at creation, expensive to move later (a real Postgres migration, not a config flip) — revisit before real student PII accumulates if DPDP data-residency matters.
- `database.types.ts` is hand-written, not generated — `supabase gen types --db-url` needs a `supabase login` / `SUPABASE_ACCESS_TOKEN` (the CLI version in this environment requires auth even for direct-db-url mode); the hand-written file matches the applied schema and was validated by `npm run build` + a live signup/login round trip, but a real regen is still worth doing once someone can `supabase login` interactively.
- A real scannable QR image for the Grid Station (decision 18) — needs a one-line dependency decision (vendor a small encoder, or add a package).
- `docs/starter-question-bank.csv` hasn't been imported into a real Surge yet.
- Docs 01–11 + App PRD + Data Model & Security were never generated (skipped at the user's request) — the Data-Model-&-Security equivalent lives as comments in the migration files instead of a standalone doc.
- **Secrets hygiene:** the Supabase publishable key, secret key, and DB password were shared directly in chat (not avoidable given the environment) and are now sitting in this session's transcript. They're correctly gitignored (`template/.env.local`) and not committed, but the user may want to rotate the DB password once real student data is in play, purely because it transited a chat log.
- Not yet done: Vercel deployment (next step per the user's stated order), regenerate `database.types.ts` for real, import the starter question bank, a real QR image, docs 01–11.

---

## Build log

*Newest last. One entry per phase: what was built, what was verified, any deviation.*

### Phase 0 — Setup
- Cloned from the Website IDP (`github.com/PB515/IDP`) into its own folder, git history started fresh (this is a frozen, independent copy — improvements to the IDP later don't touch this site).
- Placed `docs/project-spec.md` (canonical V3+V4 merged spec), `docs/project-spec-v4-addendum.md` (historical, superseded), and `docs/starter-question-bank.csv` (real seed content).
- Filled this file's Decisions section directly from the spec's own §9 + earlier sections — nothing invented.

### Phase 1 — Foundation (security-first: schema → RLS → auth → features)
- **Skipped the planned doc-gen step** (docs 01–11) at the user's explicit interruption — see Resume note above. Went straight from spec to schema to code.
- **Schema + RLS + RPCs** (`0003`–`0009`): every sensitive write (Joule ledger, surge answers, admin roster, audit log) goes through a `SECURITY DEFINER` RPC, not a direct client insert — deny-by-default achieved by simply not granting `authenticated` any write policy on those tables. Found and fixed one real cross-user leak before it shipped (decision 15).
- **Auth**: student signup ("The Connection," connection-strength meter) with pre- and post-signup domain validation, student login, admin login (separate, role-checked), `proxy.ts` route protection, a `next=` redirect param so a QR deep-link survives a login detour, Supabase-native password reset.
- **Node**: dashboard (count-up hero numbers, tier badge + progress, Power Grid, recent activity), QR check-in (`/scan`, deep-link + manual fallback), Live Surge Mode (prefetch-once, per-question timer, lock/reveal), Surge Matrix (staggered reveal + personal result card for everyone, not just top 10), Catalyst Records (season-browsable, static), profile (view/edit, logout).
- **Admin**: role-gated shell, Grid Station (rotating token display + live metrics, Volunteer-scoped-to-one-event access), Surge Builder (CSV import with duplicate/range flagging + manual add + inline edit), System Ledger (month-by-type engagement chart + filterable event timeline), Student Data Vault (search, Force Reset via service-role + audit log, manual Joule adjustment, lock/unlock), Institution Settings (allowed domains, seasons, admin roster).
- **Verified**: `npm run typecheck`, `npm run lint`, `npm run build` (production), and `npm run test` (pre-existing template suite) all pass clean in `template/`. **Not verified**: anything requiring a live Postgres (no Docker here) — the cross-user-denial gate itself still needs to be run for real, not just reasoned through.
- Added `scripts/bootstrap-owner.ts` + `docs/runbooks/jules-setup.md` to make the "no real secrets yet" gap concrete and unblock the next session.
- Not yet done: run `migrate:up` against a real DB, regenerate `database.types.ts` for real, import the starter question bank into a live Surge, a real QR image, docs 01–11.

### Phase 1 — Live verification (git + hosted Supabase)
- **Git:** repo pushed to `git@github.com:PB515/Jules.git` (`main`). No SSH key existed on this machine — generated one, user added it to their GitHub account, verified with `ssh -T git@github.com` before pushing. Pre-commit hook (`lint:ai-tell`) caught 24 real em-dashes across the build; fixed all of them (not bypassed) before the commit landed.
- **Supabase:** user created a hosted project (Tokyo region — flagged, see Known open items) and supplied the new-format keys (`sb_publishable_...` / `sb_secret_...`, the current replacements for anon/service-role) plus a direct Postgres connection string. Wrote `template/.env.local` (gitignored).
- **Migrations:** all 9 applied via `npm run migrate:up` (run with cwd=`template/` so it picks up the right `.env.local` and resolves `db/migrations` directly). One real failure caught and fixed: `hmac(text, text, unknown) does not exist` — hosted Supabase's `pgcrypto` lives in the `extensions` schema, not `public`, and `hmac` needs `bytea` args, not `text`. Fixed in `0004_jules_functions.sql` (decision 16 updated).
- **First Owner bootstrapped** via `scripts/bootstrap-owner.ts` (email chosen by the user).
- **Live end-to-end verification in a real browser** (not just build/typecheck): Owner login at `/admin/login` → real redirect to `/admin` → System Ledger rendered with correct real empty states. Student signup at `/signup` (after discovering Supabase Auth rejects the placeholder `yourcollege.edu` domain as undeliverable — expected, since it's a fake domain; temporarily allow-listed `gmail.com` to prove the mechanism, then reverted it and deleted the test account) → `/dashboard` rendered with the real name, Ember tier, `0`/`0` Joules, and a correct `159`-day season countdown computed from the seeded placeholder calendar.
- **Found and fixed a real bug live**: `/admin/login` redirect-looped because it lived inside the guarded `app/admin/layout.tsx`. Restructured to `app/admin/(protected)/*` + unguarded `app/admin/login/` (decision 20). Re-verified `typecheck` + production `build` clean after the restructure.
- Not yet done: Vercel deployment (next per the user's stated order), real domain/season calendar, starter question bank import, real QR image, docs 01–11.
