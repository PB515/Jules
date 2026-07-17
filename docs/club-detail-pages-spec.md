# Club Detail Pages — Universal + Club-Specific FAQ

**Status:** Spec only, not yet implemented. Produced entirely through ideation
(no code was touched while drafting this) — this file is the full handoff for
whichever Claude Code session builds it.

## Context

Today, each club's public page (`app/(general)/clubs/[slug]/page.tsx`) shows
only a single one-line `description` pulled from the `clubs` table, then
socials and events. The real source document — "SOP for Students Conduits"
(Adani University FMS, Faculty Chair Dr. Riya Mehta) — has much richer
per-club content (Objectives, Activities and Initiatives) plus a set of
program-wide rules that apply identically to every club (membership,
selection process, final authority, etc.). This spec turns that real content
into two new sections on every club's detail page.

**The `/clubs` list page (`app/(general)/clubs/page.tsx`) does NOT change.**
It stays a plain card grid, no info added there. All new content lives only
on the per-club detail page.

## Page structure addition

On `app/(general)/clubs/[slug]/page.tsx`, insert two new sections between the
existing header/socials block and the existing Upcoming/Past events
sections:

1. **Card-trio** (club-specific, always visible, no interaction needed) —
   three cards side-by-side on desktop, stacked on mobile, matching the
   site's existing card style (rounded border, `bg-card`, hover-to-gold —
   same convention as the `/clubs` and `/events` grids). Each card:
   - A small icon at the top, distinct per card (e.g. a target/compass for
     "Focus," a spark/trophy for "What You Gain," a calendar/bolt for
     "Activities")
   - A short title: **Focus** / **What You Gain** / **Activities**
   - 2-3 lines of the club-specific copy (drafted below, per club)

2. **Club rules accordion** (universal, collapsed by default) — the same 6
   questions on every club's page, click-to-expand. Content is identical
   across all clubs (see "Universal FAQ" below) — do not vary this per club.

Suggested order on the page: cover image → name/mentor → **card-trio** →
socials (if any) → Upcoming events → Past events → **club rules accordion**
(near the bottom, since it's repeated boilerplate a student only needs
occasionally).

## Data model changes needed

The `clubs` table (`db/migrations/0020_synergy_multiclub_rbac.sql`) currently
has only `name`, `slug`, `description` (plus `instagram_url`/`linkedin_url`/
`x_url` added in `0028_club_social_links_and_public_page.sql`). This spec
needs a new migration adding:

- `mentor_name text` — the faculty mentor's name (e.g. "Dr. Namita Pragya")
- `focus text` — can reuse the existing `description` column instead of a
  new one, since "Focus" and the current one-line description are the same
  kind of content — just confirm this at implementation time rather than
  creating a redundant column
- `gain text[]` — 3-4 bullet strings for "What You Gain"
- `activities text[]` — 3-4 bullet strings for "Activities"

`public_clubs()` (defined in `0028_club_social_links_and_public_page.sql`)
needs to return these new columns, and `database.types.ts` needs
regenerating/updating to match.

The **universal rules FAQ should NOT be stored in the database** — it's
identical on every page and not something a professor needs to edit per
club, so it belongs as a hardcoded constant in the page component (same
pattern this codebase already uses for `TYPE_LABEL`/`NAV` constants), not a
table.

**Admin editor:** the existing per-club editor at
`app/admin/(protected)/settings/clubs-section.tsx` (+ `actions.ts`) already
lets a professor edit `description`/`instagram_url`/etc. for each club —
extend that same form with `mentor_name`, `gain`, `activities` fields rather
than building a separate editor.

## One known content gap

**SRISTI Club** has no Objectives/Activities section in the source SOP
document (a gap that existed since this club was first imported — do not
fabricate content to fill it). Its card-trio should only show the "Focus"
card; omit "What You Gain" and "Activities" (or show a small "More details
coming soon" placeholder) until the faculty mentor supplies real copy.

---

## Universal FAQ (identical on every club's page — accordion)

**How do I join a club?**
Submit a membership application form circulated by the Program Office, FMS.
The club's faculty mentor may run a selection process — interviews, written
statements, or group discussions — to evaluate candidates. You'll be
notified as accepted, waitlisted, or declined after the deadline.

**How many members does a club have, and who's eligible?**
Each club has exactly 10 student members (not counting the faculty mentor)
— 5 from first year, 5 from second year. Every MBA student at FMS is
eligible to apply, though some clubs may weigh interest or relevant
experience. You can only be a member of one club at a time.

**Who has the final say on club activities?**
The club's faculty mentor has final decision-making authority over all club
activities, site visits, field visits, and student participation. For
selection decisions, the Faculty Chair's decision is final.

**What's expected of members?**
Attend meetings regularly, actively participate in club activities,
contribute positively to the club's goals, and follow club rules. One or two
members are nominated, alongside the faculty mentor, to document the club's
events and activities.

**Can membership be taken away?**
Yes — for consistently breaking club rules, unethical conduct in the club's
name, disruptive behavior, or failing to meet membership responsibilities.

**Are there leadership roles within a club?**
Yes — members can take on roles like President, Vice President, Treasurer,
or Event Coordinator, typically through annual elections or nominations per
the club's own structure.

---

## Club-specific content (card-trio, per club)

Condensed from the real SOP text — short enough for a card, not a wall of
text. Each club: Focus (2-3 sentences) / What You Gain (3-4 bullets) /
Activities (3-4 bullets).

### Joules Club — Energy — Faculty mentor: Dr. Namita Pragya

**Focus:** Exploring the challenges and opportunities in the energy sector —
from renewable technology to energy policy — as the world's demand for
sustainable energy grows.

**What You Gain:**
- Direct exposure to the energy industry through guest lectures, panel
  discussions, and industry visits
- Hands-on skill-building in energy economics, renewable technologies, and
  sustainable business practices
- A shot at startup challenges, hackathons, and mentorship in the energy
  space
- Involvement in energy conservation and sustainability community projects

**Activities:**
- Speaker series with industry leaders, policymakers, and researchers
- Workshops on energy finance, renewable-project management, and energy
  trading
- Field trips to renewable energy facilities, startups, and government
  agencies
- Consulting projects with local businesses and national/international case
  competitions

### Gati (गति) Club — Transport & Logistics — Faculty mentor: Prof. Rachna Gangwar

**Focus:** The strategic, operational, and technological challenges of
transportation, supply chain management, and logistics, as global trade and
commerce keep expanding.

**What You Gain:**
- Insight into global transportation trends, logistics strategy, and supply
  chain optimization
- Skill-building in logistics management, transportation economics, and
  global trade regulations
- Exposure to blockchain, AI, and IoT applications in logistics
- Real-world experience through case competitions, consulting, and
  simulations with industry partners

**Activities:**
- Speaker series with logistics, transportation, and tech professionals
- Workshops on supply chain analytics, warehouse management, and
  sustainable logistics
- Field trips to logistics hubs, distribution centers, and ports
- National/international case competitions, networking mixers, and career
  fairs

### Cityscape Club — Urban & Real Estate — Faculty mentor: Dr. Karan Radia

**Focus:** The economic, environmental, and social sides of urban
development, real estate markets, and sustainable urban planning, as cities
grow and evolve.

**What You Gain:**
- Insight into urban development trends, real estate investment strategy,
  and property management
- Skill-building in urban economics, real estate finance, and sustainable
  planning practices
- Hands-on experience through case competitions, simulations, and
  consulting projects
- Awareness of affordable housing and community revitalization issues

**Activities:**
- Speaker series with urban planners, developers, investors, and
  policymakers
- Workshops on real estate investment analysis, property valuation, and
  urban regeneration
- Field trips to real developments and urban planning agencies
- National/international real estate case competitions and alumni
  networking events

### Shastra Club — Finance, Economics & Policy — Faculty mentor: Dr. Riya Mehta

**Focus:** The interconnected worlds of finance, economics, and public
policy — how global markets and policy shifts shape business strategy.

**What You Gain:**
- Insight into global financial markets, economic theory, and policy
  developments
- Skill-building in financial analysis, economic forecasting, risk
  management, and policy analysis
- A voice in discussions and advocacy on real economic and regulatory
  issues
- The chance to contribute to research and publications with real
  thought-leadership value

**Activities:**
- Speaker series with economists, policymakers, and financial analysts
- Workshops on financial modeling, economic policy analysis, and investment
  strategy
- Policy debates, panel discussions, and research symposia
- National/international finance and economics case competitions

### Marketing Mavericks Club — Marketing & Social Media — Faculty mentors: Prof. Anindita Chatterjee, Prof. Shamindra Nath Sanyal

**Focus:** The fast-moving world of marketing strategy and social media, as
digital platforms keep reshaping consumer behavior.

**What You Gain:**
- Insight into digital marketing trends, consumer behavior, and brand
  management
- Direct networking with alumni, faculty, and marketing professionals
- Skill-building in marketing analytics, digital advertising, SEO, and
  influencer marketing
- Room for creative experimentation through brainstorming and hackathons

**Activities:**
- Running real social media campaigns for club events or local businesses
- Speaker series with marketing professionals, influencers, and digital
  strategists
- Workshops on digital tools, analytics, content creation, and personal
  branding
- Networking mixers, industry panels, and career fairs

### Nexus Club — Project Management & Operations — Faculty mentor: Prof. Krishna Murthy Inumula

**Focus:** Project management methodologies, operational efficiency, and
strategic execution — the skills behind getting complex work done well.

**What You Gain:**
- Skill-building in project planning, scheduling, risk management, and
  agile methodologies
- Exposure to lean management practices and operational technology
  integration
- A path toward certifications like PMP and Six Sigma through training and
  exam prep
- Industry insight into PM frameworks, supply chain, and process
  improvement

**Activities:**
- Networking receptions, industry panels, and career fairs with PM and
  consulting firms
- Speaker series with project managers, operations executives, and supply
  chain specialists
- Workshops on PM software, process optimization, and risk assessment
- Site visits to manufacturing plants, distribution centers, and project
  sites

### StratEdge Club — Startup, Innovation & Digital Tech — Faculty mentor: Dr. Vidya Mohan

**Focus:** Entrepreneurship, innovation, and the impact of digital
technology on business — for students who want to build, not just study.

**What You Gain:**
- Mentorship and support to develop entrepreneurial skills and launch real
  ventures
- Exposure to design thinking, ideation, and disruptive-technology workshops
- Understanding of how AI, blockchain, IoT, and data analytics are
  reshaping industries
- Networking with alumni entrepreneurs, incubators, and tech accelerators

**Activities:**
- Workshops and bootcamps on lean startup methodology and fundraising
- Startup pitch competitions and business plan competitions
- Tech demos and innovation expos
- Entrepreneurial mentoring and speaker series with founders and VCs

### Film Club — Communication — Faculty mentor: Dr. Baishali Mitra

**Focus:** Creativity, storytelling, and critical thinking through cinema —
using film as a tool for communication, leadership, and social change.

**What You Gain:**
- Appreciation for world cinema, documentaries, and diverse storytelling
  traditions
- Critical-thinking practice through discussions on leadership, ethics, and
  teamwork as portrayed in film
- Hands-on creative experience in scriptwriting, direction, and editing
- Industry exposure to filmmakers, actors, producers, and media
  professionals

**Activities:**
- Regular film screenings with moderated discussions
- Short film festivals, documentary showcases, and screenplay contests
- Workshops and masterclasses on filmmaking and video editing
- "Business Through Cinema" screenings connecting films to leadership,
  finance, and marketing

### SRISTI Club — Societal Welfare — Faculty mentor: Dr. Manju Raisinghani

**Focus:** Dedicated to societal welfare initiatives within the FMS
program.

**What You Gain / Activities:** Not yet available in the source document —
show only the Focus card for this club until the faculty mentor supplies
fuller detail. Do not invent content here.

---

## Implementation checklist (for the building session)

1. New migration: add `mentor_name text`, `gain text[]`, `activities
   text[]` to `clubs` (decide whether to reuse `description` for "Focus" or
   add a dedicated column — check current usage first).
2. Update `public_clubs()` RPC to return the new columns; update
   `database.types.ts`.
3. Extend `app/admin/(protected)/settings/clubs-section.tsx` +
   `actions.ts` so a professor can edit mentor name / gain bullets /
   activities bullets per club, same pattern as the existing
   description/social-link fields.
4. Add the card-trio component + universal-FAQ accordion component to
   `app/(general)/clubs/[slug]/page.tsx`, seeded with the content above.
5. Seed the 9 real clubs' new fields with the drafted copy above (SRISTI
   gets Focus only).
6. Verify: typecheck/lint/build, live-check a club with full content and
   SRISTI (partial content) in the browser, confirm the admin editor
   round-trips correctly.
