# CLAUDE.md — Jules

*The context anchor for this site. Read first every session. Keep Status and the Build Log current at the end of every phase.*

---

## What this is

A mobile-first Progressive Web App for "Jules," a college energy-management club. It turns club participation (meetings, expert sessions, volunteer tasks, live quizzes) into a gamified engagement system — "Joules" earned via QR check-in and quiz ("Surge") participation, standing tiers (Ember → Volt → Current → Plasma), and a permanent archive ("Catalyst Records"). Two sides: the student "Node" experience and the admin "Reactor Command Center" (role-scoped: Owner/President, Officer, Event Volunteer). This is an **authenticated app with private per-user data** — the portal golden path applies, security-first.

Full concept + already-decided product/technical detail: [`docs/project-spec.md`](docs/project-spec.md) (the canonical, merged V3+V4 spec — treat as both the substance/strategy authority; there is no separate competitor-research doc since this isn't a commercial business). Historical: [`docs/project-spec-v4-addendum.md`](docs/project-spec-v4-addendum.md) (superseded by project-spec.md, kept for reference only).

## Current status

- **Phase:** 0 of 6 — Setup
- **Last completed:** Cloned from the Website IDP, source spec + starter question bank placed in `docs/`, this file filled from the spec's own decisions.
- **Next up:** Generate the doc set (01–11 + App PRD + Data Model & Security, since this is an authenticated app) from `docs/project-spec.md` per `docs/doc-gen-master.md`'s process, surfacing gaps/contradictions first. Then Phase 1 per `docs/golden-paths/portal.md`: auth → RLS → **prove cross-user denial** → features.
- **Last commit:** — (not yet committed)
- **Resume note:** Nothing built yet. Two facts are genuinely unknown and flagged by the spec itself (see "Known open items" below) — do not invent values for them.

## Stack

Next.js App Router · Tailwind v4 + tokens · Supabase (4-client split + RLS) · Vercel. PWA scaffold already present in the template (`app/manifest.ts`, `public/sw.js`, `lib/pwa/register-sw.tsx`) — this project actually needs it, unlike most clones.

## Conventions

Tokens only — no hardcoded hex · secrets in `.env.local` only · no new/upgraded deps without asking · git per phase, branch per phase · changing a frozen doc is a separate logged step. Full list: `docs/conventions.md`.

## Decisions made (do not revisit)

*Pulled directly from `docs/project-spec.md`'s own "Decisions Resolved" (§9) plus the earlier sections that already fixed a shape. Re-opening one is a deliberate, logged action — except the two starred items, which are placeholders by the spec's own admission and MUST be resolved with real facts before launch.*

1. **Visual direction = "solar blue"**, not the original moodboard's deep-space-black/midnight-violet — full hex token table in spec §3. Set `template/app/globals.css` tokens from this table before any UI.
2. **Tier system** — Ember (0–299) / Volt (300–599) / Current (600–999) / Plasma (1,000+), computed from `season_joules`, never stored. Spec §1/§4.
3. **Joule lifecycle** — `lifetime_joules` never resets; `season_joules` drives tier + leaderboard and resets on season end. Season cadence is admin-configurable (`Season` record: `start_date`/`end_date`/`cadence`), not hardcoded. Spec §2/§5.
4. **RBAC** — Owner/President (everything incl. Force Reset + Student Data Vault), Officer (Grid Management + Surge Builder, not the Vault), Event Volunteer (QR Scan Station only, scoped to one event, access auto-expires when it ends). Spec §7.
5. **JouleTransaction is the ledger of record** — season/lifetime totals are derived by summing it (also the audit trail), never a mutated balance column. Spec §5/§11.
6. **CSV question-import schema is final**: `question,option_a,option_b,option_c,option_d,correct_option,time_limit_seconds,tag`. A real 20-question starter bank ships at `docs/starter-question-bank.csv` — treat as first real season content, not placeholder trivia.
7. **QR anti-abuse defaults** — token rotates every 90s during a live event; scan window is 15min before/after the scheduled time; geofence 150m as a **soft flag for admin review**, not a hard block; one scan per student per event, rejected client-side on repeat. Spec §9.
8. **Concurrency plan for Surges** — pre-fetch the full question set once per Surge entry (no per-question polling); write answers to an append-only queue, not a locking balance update; compute the Surge Matrix reveal as one aggregation pass after the Surge closes, not live per-answer; rate-limit per student. Sized for 500 concurrent joiners within a 10s window. Spec §11.
9. **★ Season calendar — PLACEHOLDER, not real.** Spec assumes a standard Indian academic year (Odd/Monsoon: Jul 1–Dec 15; Even/Winter: Dec 16–May 31) based on the Gujarati Vishwambhari Stuti reference. Replace with the club's actual registrar calendar before the first season launches.
10. **★ College email domain — PLACEHOLDER, not real.** `allowed_domains` is a configurable list (regex-validated at signup, editable from an Institution Settings admin panel), currently set to `@yourcollege.edu`. Replace with the club's real domain(s) before launch.

## Where things live

- Product/technical spec (source of truth) → `docs/project-spec.md`
- Starter question content → `docs/starter-question-bank.csv`
- Golden path (security-first order for this app type) → `docs/golden-paths/portal.md`
- Tokens → `template/app/globals.css` (set from spec §3 before any UI)
- Brand/contact constants → `template/lib/site.ts`
- Schema + migrations → `template/db/migrations/`
- PWA → `template/app/manifest.ts`, `template/public/sw.js`, `template/lib/pwa/register-sw.tsx`
- Project docs 01–11 (not yet generated) → `docs/`

## Known open items (do not invent — flagged by the spec itself)

- Real college email domain(s) for `allowed_domains` (decision 10 above).
- Real registrar season/term dates (decision 9 above).
- Real club membership size, to confirm the 500-concurrent sizing assumption (spec §11) still holds.
- Push notification service choice — explicitly deferred to Phase 4, non-blocking for now.

---

## Build log

*Newest last. One entry per phase: what was built, what was verified, any deviation.*

### Phase 0 — Setup
- Cloned from the Website IDP (`github.com/PB515/IDP`) into its own folder, git history started fresh (this is a frozen, independent copy — improvements to the IDP later don't touch this site).
- Placed `docs/project-spec.md` (canonical V3+V4 merged spec), `docs/project-spec-v4-addendum.md` (historical, superseded), and `docs/starter-question-bank.csv` (real seed content).
- Filled this file's Decisions section directly from the spec's own §9 + earlier sections — nothing invented.
- Not yet done: doc-gen pass (01–11 + App PRD + Data Model & Security), `npm run setup`, `db:start`/`migrate:up`, tokens, or any code.
