
# **Project Jules — Master Specification**
### *Combined V3 + V4, implementation-ready. Written for handoff to a build agent (e.g. Claude Code).*

This document merges the original ideation (V3), the structural fixes and phased roadmap (V4), and every concrete UI/UX decision made while prototyping each screen. It is meant to be handed to whoever builds this — it includes data model shapes and design tokens, not just narrative description.

---

## **1. Executive Summary**

A Progressive Web App (PWA) for "Jules," an energy management club. Mobile-first, frictionless, cheat-resistant (see Phase 3 for what that actually requires), built to make club activities, quizzes, and events feel like a live energy grid rather than a spreadsheet of attendance.

## **2. Conceptual Foundation**

The identity bridges the Joule (SI unit of energy) with Shakti (primordial energy), rooted in the Vishwambhari Stuti — energy exists in every atom of the universe, echoing E=mc². Students are "atoms" generating "sparks" of energy through engagement. This philosophy should show up in language throughout (Node, Spark, Surge, Grid) — not just in this section. Phase 4 includes ideas for extending it further (a rotating line from the Stuti on the splash screen, naming a first logged activity "the first spark").

## **3. Visual Design System**

The moodboard's original direction was "Deep Space Black / Midnight Violet" — this was deliberately changed during prototyping to a **solar blue** background family, keeping the two accent colors from the original brief.

**Core palette (hex values used throughout every prototype screen):**

| Token | Hex | Use |
| :---- | :---- | :---- |
| Background, outer bezel | `#0f1620` | Phone frame / device chrome |
| Background, screen | `#070b12` | Main dark canvas |
| Card / input background | `#0d1620` | Rows, cards, inputs |
| Border, default | `#1c2836` | Hairlines, input borders |
| Border, muted input | `#2b2745` | Onboarding-style inputs |
| Primary accent — kumkum / vermilion | `#E34234` | Primary emphasis: icons, links, "locked" states, incorrect answers |
| Secondary accent — neon gold | `#FFC72C` | Energy values, correct answers, progress fills, primary CTAs |
| Text, primary | `#eef4fb` | Body text on dark |
| Text, secondary | `#6e8aa3` | Labels, muted UI text |
| Text, tertiary | `#5c7690` | Placeholders, hints, timestamps |
| Success (used sparingly) | `#3ba26b` | One-off positive confirmation (e.g. button click feedback) |

**Tier colors** (see Section 6, Node Dashboard):

| Tier | Text | Border | Background |
| :---- | :---- | :---- | :---- |
| Ember | `#d99a4e` | `#4a3018` | `#1c140a` |
| Volt | `#FFC72C` | `#6b4a10` | `#1c1608` |
| Current | `#FFC72C` | `#E34234` | `#1a1210` |
| Plasma | `#FFC72C` | `#FFC72C` | `#241a05` (pulses gently — the only tier with a standing animation) |

**Typography:** system sans-serif throughout. Two weights only (400 regular, 500 medium) — no bold. Sizes range from 10px (timestamps/hints) to 36px (hero balance numbers).

**Iconography:** Tabler outline icon set — `ti-bolt`, `ti-flame`, `ti-qrcode`, `ti-trophy`, `ti-award`, `ti-lock`, `ti-check`, `ti-eye` / `ti-eye-off`, `ti-upload`, `ti-plus`, `ti-trash`, `ti-key`, `ti-chevron-down` / `ti-chevron-up`, `ti-arrow-left`.

**Motion patterns established across prototypes:**
- Balance/counter numbers animate with a count-up (~700ms) rather than snapping to the new value.
- Lists that reveal in sequence (leaderboards, CSV imports) stagger each row in ~350-380ms apart.
- Crossing a tier threshold triggers a bump/scale animation on the tier badge plus a toast.
- Under 20% time remaining, the energy bar and timer flash and jitter; hitting zero triggers a brief full-screen shake.
- Ambient background particles drift gently (translateY float loop) for atmosphere on every major screen.

## **4. Gamification Framework**

- **Quizzes/screenings** are called "Sparks" or "Surges."
- **Points** are tracked as "Joules."
- **Tiers** (added in V4, replacing a generic top-10-only reward structure): **Ember → Volt → Current → Plasma**, based on **Season Joules**. Every student sits in a tier regardless of leaderboard placement.

**Joule lifecycle:**
- **Lifetime Joules** — accumulate forever, shown on profile, feed the permanent Catalyst Records archive.
- **Season Joules** — drive the current tier and the active leaderboard. Reset when a season ends.
- **Season cadence is admin-configurable, not hardcoded.** Default: semester. Admin can switch to trimester, annual, or a custom date range at any time without an engineering change. Store as a `Season` record with `start_date` / `end_date` / `cadence`.

**Tier thresholds (Season Joules):**

| Tier | Range |
| :---- | :---- |
| Ember | 0 – 299 J |
| Volt | 300 – 599 J |
| Current | 600 – 999 J |
| Plasma | 1,000+ J (uncapped — no max season goal) |

## **5. Data Model**

Derived from every screen built. Tier is **computed**, never stored, from `season_joules`.

**Student**
`id, name, college_email (unique, domain-restricted — domain TBD), phone, password_hash, season_joules, lifetime_joules, streak_days, last_active_date, status (active | locked)`

**Admin**
`id, name, email, password_hash, role (owner | officer | volunteer), volunteer_event_id (nullable — scopes a volunteer to one event, access auto-expires when the event ends)`

**Event**
`id, name, type (standard_meeting | expert_session | volunteer_task | surge), date, location, joule_value (10 | 25 | 50, null for type=surge), qr_code_token, qr_token_expires_at, total_attendees, total_joules_generated`

**Question** (belongs to a Surge)
`id, surge_id, text, option_a, option_b, option_c, option_d, correct_option (A|B|C|D), time_limit_seconds, tag (optional)`

**Surge**
`id, name, season_id, status (draft | live | complete), question_ids[]`

**JouleTransaction** (ledger — single source of truth; season/lifetime totals are derived by summing this table, which also doubles as the base for audit and analytics)
`id, student_id, event_id (nullable), surge_id (nullable), amount, type (event_scan | surge_correct_answer | admin_manual_adjustment), created_at`

**Season**
`id, label, start_date, end_date, cadence (semester | trimester | annual | custom)`

**AuditLogEntry**
`id, admin_id, action (force_reset | manual_joule_adjustment | csv_import | role_change), target_student_id (nullable), details, created_at`

## **6. Student-Side Features ("The Node")**

**Onboarding ("The Connection")** — Name, college email, phone, password. A "connection strength" meter fills as each field is completed (25% per field), turning the CTA gold once all four are filled. Target: under 30 seconds.

**Node Dashboard (home screen)** — Shows Season Joules (hero number, animated count-up), the tier badge with a progress bar to the next threshold, Lifetime Joules as a secondary line, "the Power Grid" (a 20-cell grid where each lit cell represents a logged activity), a "Scan event QR" action, and a recent-activity feed. Crossing a tier boundary fires a bump animation and a toast ("Tier up! Welcome to Plasma").

**Live Surge Mode** — One question at a time, locked/distraction-free framing. A 15-second energy bar decays per question (gold → amber → vermilion), flashing and jittering under 20% remaining; hitting zero vibrates the screen and auto-submits as unanswered. Four options (A–D); selecting one locks all options, reveals correct/incorrect, and auto-advances after ~1.1s. See Phase 3 for the anti-cheat mechanics this still needs (shuffled order per student, visibility-change detection, device binding — the timer alone is a UX deterrent, not real cheat resistance).

**Surge Matrix (immediate post-quiz reveal)** — Ranks animate in from 10th to 1st. **Critical fix from V4:** students outside the top 10 no longer get nothing — a personal result card reveals after the reveal sequence, showing their rank out of all participants and their current tier standing, so there's always a personal takeaway.

**Catalyst Records (permanent archive)** — Read-only, browsable by season via a dropdown. Static (no reveal animation) — it should feel like a settled record, not a live moment.

## **7. Admin-Side Features ("The Reactor Command Center")**

**Role-based access (V4 fix — the original doc had a single undifferentiated "admin" role):**
- **Owner/President** — full access, including Force Reset and the Student Data Vault.
- **Officer** — Dynamic Grid Management and the Hybrid Surge Builder, not the Vault.
- **Event Volunteer** — QR Scan Station only, scoped to their assigned event, access auto-expiring when it ends.

**QR Scan Station (Dynamic Grid Management)** — Admin selects the active event tier (Standard meeting = 10J, Expert session = 25J, Volunteer task = 50J), scans credit joules automatically, live session metrics (students scanned, joules distributed) update in real time, recent scans feed at the top. **V4 fix needed:** rotating QR tokens, a scan time-window, and idempotent scanning (blocking a second scan of the same event by the same student) — the original mechanism as described was vulnerable to screenshot/proxy scanning.

**Hybrid Surge Builder** — CSV import or manual "Add spark" entry. Each question row expands to reveal four option fields with a radio button marking the correct answer — this options structure did not exist in the original V3 doc and had to be defined here; it's now the canonical Question schema (Section 5). Cells are directly editable inline.

**System Ledger** — A month-over-month engagement health graph, stacked by event type (standard/expert/volunteer), click any bar for the exact joule breakdown. A filterable event timeline below it (All / Standard / Expert / Volunteer / Surge), each entry expandable to show date, location, attendees, and joules generated.

**Account Recovery** — Student self-serve: "Lost connection?" on login → enter college email → 6-digit OTP → set new password (with a mismatch check) → confirmation. Admin override: "Force Reset" in the Student Data Vault instantly issues a temporary password, with a **reset audit log** (V4 addition) recording who issued each reset, for whom, and when — the original doc had no accountability layer for an action this sensitive.

## **8. Phased Roadmap**

**Phase 1 — Foundation.** Literal question/CSV schema, RBAC, QR abuse prevention (rotation, scan window, idempotent scans), accessibility pass on the vermilion/gold semantic pairing (add icon/shape redundancy, verify contrast).

**Phase 2 — Retention and fairness.** Tier system + Season/Lifetime Joule split (both now specified above), leaderboard tiebreaker (average answer time, then earliest completion), "micro-sparks" (small optional polls between Surges to fill the 363 dead days), streak-at-risk reminders.

**Phase 3 — Trust and ops hardening.** Real anti-cheat (shuffled question/option order per student, visibility-change detection, single-device session binding), offline/flaky-wifi handling for live Surges (local timer, queued submissions, small fixed reconnect grace), audit logging extended to all sensitive admin actions, a written data retention policy.

**Phase 4 — Scale and delight.** Push notifications + PWA install prompt (timed right after first onboarding), cosmetic tier perks (particle visuals shift per tier), deeper Shakti integration in copy and small rituals.

## **9. Decisions Resolved (defaults set — two flagged items still need the club's real-world facts)**

Each item from the prior open-questions list is closed out below. Where the answer depends on a fact only the club itself knows (its real email domain, its real academic calendar), a concrete placeholder is set with an explicit flag to override before launch — everything else is a final decision.

**CSV column schema (final):**
```
question,option_a,option_b,option_c,option_d,correct_option,time_limit_seconds,tag
```
- `question` — required, string, max 280 characters, must be unique within its Surge (import checks for duplicates and flags them rather than silently dropping).
- `option_a`…`option_d` — required, string, max 80 characters each.
- `correct_option` — required, one of `A/B/C/D` (lowercase accepted, normalized to uppercase on import).
- `time_limit_seconds` — optional integer, defaults to `15` if blank, valid range 5–120; out-of-range values are imported but flagged, not rejected.
- `tag` — optional free text (e.g. `physics`, `club`, `philosophy`) for future filtering in the Surge Builder.

A 20-question starter bank in this exact schema has been generated as a companion file (`jules_starter_question_bank.csv`) so the Hybrid Surge Builder has real, importable content on day one instead of placeholder trivia. It mixes physics fundamentals, app-mechanics questions (useful for onboarding new members to how Jules itself works), and one philosophy question tying back to the Shakti/Joule concept. Treat it as a first real season, not a permanent bank — swap in club-specific content as it's written.

**College email domain restriction:** mechanism is a configurable `allowed_domains` list validated by regex (`^[^@]+@(domain1|domain2)$`) at signup, editable from an "Institution settings" admin panel rather than hardcoded — this supports one or multiple valid domains (useful if the club spans an undergrad + grad email format). **Placeholder value:** `@yourcollege.edu` — **this must be replaced with the club's real domain(s) before launch**, since I don't have that fact.

**Privacy and data retention policy:** written in full in Section 10 below.

**Concurrency plan for bi-annual Surges:** architecture notes in Section 11 below.

**QR rotation and geofence — concrete defaults:**
- QR token rotates every **90 seconds** during a live event — long enough for a normal walk-up scan, short enough that a forwarded screenshot is stale within a minute and a half.
- Scan validity window: token accepted from **15 minutes before** the event's scheduled start to **15 minutes after** its scheduled end (covers early arrivals and stragglers without leaving it open all day).
- Geofence radius: **150 meters** from the event's registered location, applied as a **soft flag for admin review**, not a hard block — indoor GPS drift makes a hard block too likely to reject legitimate scans.
- Same student ID scanning the same event twice is rejected client-side with "Already credited for this event."

**Season calendar:** given the club's cultural framing (the Vishwambhari Stuti is in Gujarati), this is very likely an Indian institution, so the default assumes a standard Indian academic year: **Odd/Monsoon semester, July 1 – December 15**; **Even/Winter semester, December 16 – May 31**. **This is a placeholder — replace with the club's actual registrar calendar before the first season launches**, since exact term dates vary by institution.

**Push notification service (Phase 4):** non-blocking for initial build; revisit once Phase 1–3 are stable.

## **10. Privacy and Data Retention Policy**

*Plain-language draft — have this reviewed against local data protection law before publishing, but the shape below is what Section 5's data model was built to support.*

**What's collected:** name, college email, phone number, password (hashed, never stored in plain text), and engagement history (Joule transactions, Surge results, event attendance).

**Why:** to authenticate members, run club activities and quizzes, calculate Joules and tier standing, and let leadership see aggregate engagement trends (System Ledger).

**Who can see it:** access is role-gated per Section 7's RBAC model. Event Volunteers see only what's needed to run their assigned event's QR station. Officers see aggregate engagement data and the Surge Builder. Only the Owner/President role sees the full Student Data Vault, including the ability to Force Reset — and every Force Reset is recorded in the audit log with who performed it and when (Section 7).

**How long it's kept:** for the duration of active membership, plus one year after a student becomes inactive or graduates, after which personal identifiers (email, phone) are anonymized while aggregate/historical Joule and Catalyst Records data is retained for the club's historical record.

**Right to deletion:** a student can request full account deletion by contacting club leadership; this removes personal identifiers immediately rather than waiting for the one-year window, though anonymized historical leaderboard placements (e.g. "Top 10, Winter Surge 2026") persist without the name attached if the student was publicly ranked.

**Security baseline:** passwords are hashed (never stored or logged in plain text), admin actions against student accounts are audit-logged, and QR/session tokens expire on the schedule defined above rather than living indefinitely.

## **11. System Architecture Notes — Concurrency for Bi-Annual Surges**

The failure mode to design around: a Surge is a synchronous event, so most of the club opens the app within roughly the same 10–30 second window. That's fundamentally different traffic from the rest of the year's steady trickle of QR scans, and it needs to be treated as a distinct load case, not scaled up from average daily usage.

- **Pre-fetch, don't poll per question.** The full question set for the active Surge should be fetched once when a student enters Surge Mode, then served from local state for each of the five questions. The only live network call during the quiz should be submitting each answer — not fetching each question fresh.
- **Write answers to an append-only queue, not a locking row update.** Joule transactions during a live Surge should land in the `JouleTransaction` ledger via an async queue/write-behind pattern rather than a synchronous read-modify-write on the student's balance, so a burst of simultaneous correct answers doesn't serialize against each other.
- **Compute the Surge Matrix reveal after the Surge closes, not live per-answer.** Rank the leaderboard via a single aggregation pass over `JouleTransaction` once the Surge's time window ends, rather than recalculating standings on every incoming answer.
- **Rate-limit per student, not just globally** — one submission per question per student, rejecting duplicate/replayed submissions outright.
- **Sizing assumption (flag to confirm against real club size):** designed to comfortably handle **up to 500 concurrent participants** joining within a 10-second window. If the club's actual membership is meaningfully larger, this number should be revisited before the first live Surge, not after it falls over.
