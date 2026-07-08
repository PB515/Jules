

# **Project Jules V4: Structural Fixes, Tier System, and Phased Roadmap**

This is an addendum to *Project Jules V3*. V3 nailed the concept, the moodboard, and the feature list. Reviewing it against how it would actually behave in the wild surfaced a set of structural gaps — mechanics that were implied but never specified. This document defines those mechanics and organizes the fixes into four build phases.

## **1\. The Tier System (Energy states, not medals)**

The single biggest fairness gap in V3: only the top 10 students in any Surge get recognized. Everyone else gets silence. The fix is a standing tier system every student sits inside, independent of whether they ever crack a leaderboard.

**Tier names (ascending):** Ember → Volt → Current → Plasma

The naming follows the physics of energy itself rather than borrowing bronze/silver/gold from sports: Ember is a spark just catching, Volt is energy starting to register, Current is a steady sustained flow, Plasma is matter at its highest energy state. It stays inside the Joule/Shakti vocabulary already established rather than importing an unrelated metaphor.

| Tier | Season Joules | Feel |
| :---- | :---- | :---- |
| Ember | 0 – 299 J | Just connected, first sparks logged |
| Volt | 300 – 599 J | Consistent engagement building |
| Current | 600 – 999 J | A steady, visible contributor |
| Plasma | 1,000+ J | Top-tier energy, regardless of leaderboard rank |

**Where it shows up:**

* Node Dashboard: a tier badge sits next to the Joules balance, always visible, always chasing the next threshold.  
* Surge Matrix reveal: students outside the top 10 get a soft-landing message instead of nothing — e.g. "Didn't crack the top 10 — you're Current tier now."  
* Tier-up moment: a small celebratory beat fires the instant a student crosses a threshold, so there's positive feedback that doesn't depend on any live event happening at all.

## **2\. Joule Lifecycle (semester default, not rigid)**

V3 never specified whether Joules reset. Two counters solve this cleanly, and keep the reset cadence a setting rather than a hardcoded rule:

* **Lifetime Joules** — never resets. Shown on the student's profile and is what permanently populates the Catalyst Records across all past seasons.  
* **Season Joules** — drives the current tier and the active season leaderboard. Resets when a season ends.

**Reset cadence is an admin setting, not a fixed rule.** A simple control: *Season length: Semester (default) / Trimester / Annual / Custom dates.* Admins set a start and end date for the current season and can change the cadence going into the next one without needing any engineering work — semester is the sensible default for a club, but leadership can switch to annual or anything else at will.

On reset: Season Joules return to 0, tier recalculates from Ember, Lifetime Joules are untouched, and the season's Surge Matrix and Catalyst Records entries are archived permanently (this is already how Catalyst Records was designed — the reset just formalizes when a new archive begins). A visible "Season ends in X days" indicator prevents the reset from feeling like a bug when it happens.

## **3\. Phase 1 — Foundation**

*Fix before real use. Cheap now, expensive to retrofit later.*

**Question schema and CSV contract.** V3 says CSV import "populates an editable data table" but never defines the shape. Fixed fields: question text, four options, one marked correct answer, time limit in seconds, optional tag/difficulty. On import, invalid rows (missing a correct answer, no time limit, duplicate question text) get flagged inline in the table with a small warning icon rather than blocking the whole upload — consistent with the doc's own "any cell can be clicked to adjust" principle.

**Role-based admin access.** Right now every admin can Force Reset any student and see the full Student Data Vault. Split into three tiers: Owner/President (everything, including Force Reset and the Vault), Officer (Dynamic Grid Management and the Surge Builder, not the Vault), Event Volunteer (QR Scan Station only, and only for their assigned event — access can auto-expire when the event ends).

**QR scan abuse prevention.** A screenshotted QR code currently works forever for anyone. Fixes: the code rotates every few minutes during a live event so a forwarded screenshot goes stale fast; scanning only counts inside the event's scheduled window plus a small grace period; the same student ID can't credit the same event twice (second scan shows "already credited," not a duplicate award). GPS geofencing can be added as a soft flag for admin review rather than a hard block, since indoor GPS is unreliable enough that false rejections would cause more support tickets than fraud caught.

**Accessibility pass.** Vermilion vs. gold currently carries meaning (correct/incorrect, locked/active) through color alone. Add a shape or icon alongside color everywhere it matters — Live Surge Mode already does this correctly (check/X icons), but Locked/Active status badges and a few other places don't yet. Confirm text contrast against the dark backgrounds meets WCAG AA before this scales past the club's first cohort.

## **4\. Phase 2 — Retention and Fairness**

*Ship right after launch.*

* Build the Ember/Volt/Current/Plasma tier system and the season/lifetime Joule split described above.  
* Add a tiebreaker for identical leaderboard scores: average answer time wins, earliest completion timestamp as the final tiebreaker.  
* Introduce "micro-sparks" — optional single-question daily or weekly polls worth a small number of Joules, so there's a reason to open the app between the twice-a-year Surges. This directly addresses the biggest retention risk in V3: the core excitement only exists on two days a year.  
* Extend the existing 7-day streak badge with an at-risk reminder before it breaks (ties into Phase 4's notification system).

## **5\. Phase 3 — Trust and Ops Hardening**

*As usage scales past one club or one semester.*

* **Real anti-cheat:** shuffle question order and option order per student so answers can't be called out loud to a neighbor ("it's B" stops working when B is different for everyone). Detect tab/app-switching during Surge Mode via the Page Visibility API and flag it for admin review rather than an automatic penalty, since accidental backgrounding happens. Bind an active Surge session to a single device so a second simultaneous login is blocked.  
* **Offline/flaky-wifi handling:** run the countdown timer locally rather than depending on constant server polling, so a brief drop doesn't freeze or lose time. Queue answer submissions locally and retry on reconnect. A short, fixed reconnect grace window (not unlimited) keeps this from becoming its own cheat vector.  
* **Full audit logging:** extend the Force Reset audit log (already built) to cover every sensitive admin action — manual Joule adjustments, CSV overwrites, role changes — not just password resets.  
* **Data retention policy:** a plain-language statement of what's collected (name, college email, phone), how long it's kept, who can see it under the new role tiers, and how a student's data is removed when they leave the club.

## **6\. Phase 4 — Scale and Delight**

*Later. Nice-to-have once the fundamentals are solid.*

* Push notifications and a real "add to home screen" prompt, timed to appear right after a student's first successful onboarding, when motivation is highest. Notification types: Surge starting soon, streak at risk, tier-up achieved, season ending soon.  
* Cosmetic tier perks: the Node Dashboard's particle visuals shift by tier — Ember a dim flicker, Volt brighter gold, Current a dual kumkum-gold tone, Plasma both accents at full intensity with an extra animation flourish. Reuses the particle system already built, just re-themed per tier.  
* Deeper Shakti integration beyond the executive summary: a rotating line from the Vishwambhari Stuti on the splash/loading screen, or naming a student's first logged activity "the first spark" — small touches that make the philosophy something students actually encounter, not just something written about it.

