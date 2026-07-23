# Synergy — Design Brief for "Wow Factor" Pass

*Give this whole file to whatever design tool you're using (Claude, another AI, a human designer) alongside a few real screenshots. It's written to be self-contained — someone with zero prior context on this project should be able to read it and start designing.*

## What this is

Synergy is a mobile-first PWA that's the shared engagement platform for all 9 clubs in the Adani University FMS/Infra Management MBA program. Students earn "Joules" (points) via QR check-in at events and quiz participation ("Surge" = async, self-paced; "Live Round" = host-paced, Kahoot-style, played in real time as a class). Points map to standing tiers — Ember → Volt → Current → Plasma. There's a public marketing/info site (no login), a student PWA (installed-only, phone-only by hard requirement — never a laptop, since quizzes need to be distraction-free and fair), and a staff PWA (Professor/Committee Member/Super Admin).

**The backend, data model, and every core flow are built and live-tested — this brief is only about how it looks, feels, moves, and sounds. Do not propose new features or data model changes.**

## Direct feedback from the actual professor overseeing this (read this before anything else)

A full 3D avatar/cosmetic-unlock system was built once and shown to her — she rejected it explicitly: **"we are doing MBA, this is childish, we need to be professional."** In the same review, she **loved** the escalating correct/incorrect sound cues and drama-building suspense (drumroll, winner burst) during Live Round quizzes.

The real target is a specific grey area: **professional first, fun through restraint and craft — not through gamified spectacle.** Concretely, that means:
- Subtle micro-interactions (hover states, press feedback, smooth shade/color transitions) over flashy animated mascots or 3D scenes.
- Sound/haptic drama is proven to land well *inside the quiz experience specifically* — that's earned, keep it. Don't extend that same energy to, say, the admin dashboard or a professor's tracking screen, which need to read as calm and trustworthy.
- When in doubt between "make it delightful" and "make it feel like a serious, well-built product a university would actually deploy," pick the second — delight should come from things being *smooth and considered*, not loud.

## Who actually uses this, and what they want in the moment

- **Students** — open it in class or between classes, mostly on Android, some iPhone. They want quizzes to feel fun and fast, not like a form. The single most repeated real feedback so far: they want to feel a genuine "win" moment, not just see a number change.
- **Committee Members** — real students given extra responsibility for one club. They create events and write post-event reports, often from their phone standing in a hallway right after the event ends. They want this to feel quick and low-friction, not like paperwork.
- **Professors** — faculty, busy, checking this between other responsibilities. They want to glance at a screen and immediately understand "is this event going well," not parse a dashboard. They scan students in with a QR code they display on their own phone.

## Brand identity (do not invent new colors — extend from these)

Real design tokens, `template/app/globals.css`:

| Token | Hex | Meaning |
|---|---|---|
| `--gold` (misleading name, kept for legacy reasons) | `#BD3861` | X11 Maroon — the actual primary brand/CTA color, "correct answer," energy/points |
| `--accent` | `#c7401a` | Warm orange-red — danger, incorrect, locked. Deliberately a different hue from the brand maroon so "wrong answer" and "brand identity" never visually collide |
| `--success` | `#2e8659` | Green — confirmation states (QR scan success, correct-answer highlight) |
| `--background` | `#faf7f2` | Warm ivory canvas (light theme — the professor explicitly asked to move away from the earlier dark navy) |
| `--card` | `#ffffff` | Cards, rows, inputs |
| `--foreground` | `#2a2521` | Body text — warm near-black, never pure black |

Tier colors (Ember/Volt/Current/Plasma) are light pastel tints — see `globals.css` for exact values.

The palette is sourced from Adani Group's real official brand colors (Honolulu Blue, X11 Maroon, Persia lavender), so it should read as *belonging to* a real Indian university, not a generic startup. Existing visual motif: an "atom generating a spark" concept (the app icon is two crossed orbital ellipses + a bolt) — reuse this shape language rather than inventing a new mascot from scratch, unless a stronger concept clearly earns its place.

**Typography**: currently system-ui only (`--font-display`/`--font-body`), no custom typeface. Open to a real font pairing if it earns its place — flag this as a real, live design decision to make, not settled.

## The 6 hero moments worth investing real "wow factor" in

Everything else stays functional/clean — these are the specific places worth going deep:

1. **PWA install / first-open splash** — already has a basic version (logo jolt → tagline → dashboard reveal, once per day). Real opportunity to make first impressions land.
2. **Live Round "Winner Declaration"** — the true final-question reveal, currently confetti + a sound cue + haptic vibration. This is the single most social, most-witnessed moment (a whole classroom watching one screen/projector).
3. **QR check-in success** — the instant a student's phone confirms attendance. Currently a plain success state.
4. **Tier-up celebration** (Ember→Volt→Current→Plasma) — currently exists but is basic. A student crossing a tier boundary should feel like leveling up in a real game.
5. **Event Report submitted** (Committee Member's moment) — right now it's a plain redirect. This is their one payoff moment after real work; currently under-celebrated.
6. **Event Report downloaded / Professor's tracking view** — the Professor's own "this club is doing well" glanceable moment. Less about celebration, more about information *feeling* alive (live-updating numbers, not static tables).

## Constraints that matter (real, not hypothetical)

- **This runs on a phone, often mid-class, sometimes on cellular data.** Large video files or heavy animation cost real battery and data. Prefer short, compressed, looping clips over long autoplay video. Static images/illustrations over video wherever a still moment communicates the same thing.
- **Sound must degrade gracefully.** A lot of students keep phones on silent in class — sound is a bonus layer, never the only signal for something important. Haptic vibration already exists as a parallel channel.
- **A real, hard-learned lesson from this exact project**: a full 3D avatar/cosmetic-unlock system (Three.js/React Three Fiber, GSAP) was built once, then entirely scrapped a few sessions later when the product pivoted from single-club to multi-club. Not because it was bad — because it was invested in before scope was locked. **Prefer flexible, cheap-to-redo art (static illustration, simple CSS/SVG animation, short video loops) over heavy 3D/engine-driven work**, unless there's a very deliberate reason to go there.
- **Accessibility**: real color-contrast requirements apply (this codebase already respects `prefers-reduced-motion` in several places) — any new animation needs a reduced-motion fallback, not just a delight-only path.
- **No hardcoded hex values in code** — any new color must become a token in `globals.css`, named semantically (matches this project's own standing convention).

## What already exists (don't regenerate these)

- App icon: `public/icons/icon.svg` (atom-orbit + spark mark)
- Gallery empty-state illustration: `lib/components/gallery-placeholder.tsx` (abstract "energy grid" node scatter)
- Event cover placeholder: `lib/components/event-cover-placeholder.tsx` (spark-burst motif)
- Homepage ambient background: `lib/components/energy-field.tsx` (particle network, CSS-only, idle drift)
- Homepage hero centerpiece: `lib/components/hero-atom.tsx` (bigger animated atom mark)
- Confetti/sound/haptics: `lib/components/winner-burst.tsx`, `lib/jules/sound.ts`, `lib/jules/haptics.ts`
- Real Adani University logo: `public/brand/adani-university-logo.png` (footer only)

## Cheap, professional polish — a real audit, not a guess (do this alongside the 6 hero moments, not instead of)

A direct code audit found the app is currently under-polished in a very specific, cheap-to-fix way — this is the "grey area" territory the professor's feedback points at:

- **Only 23 `transition` declarations exist across the entire app**, and just 4 distinct animation durations are used anywhere. Hover/press feedback is sparse by omission, not by intentional restraint.
- **20+ primary call-to-action buttons** (Login, Register, Submit, Upload, Enter) currently have **zero hover state** — they sit completely static until clicked.
- **The one place this is already done well**: the `/events` and `/clubs` card grids (`hover:border-gold/50` + `transition-colors`) — this is the proven, on-brand reference pattern. Extend it everywhere, don't invent a new one.
- A few clickable rows (the admin Student Vault's expandable rows, Live Round's host screen) also have no hover/press cue.
- No shared Button component exists yet — every button is hand-written per file, so fixing this is genuinely small, mechanical, low-risk work (adding a consistent `transition-colors` + a slightly-deeper-maroon hover state), not a redesign.

If your wireframe pass touches any of these existing screens anyway, note the intended hover/press/transition behavior directly in the design so it ships in the same pass — otherwise this is cheap enough that Claude Code can do it as a separate, fast, asset-free pass on its own.

## Logo / app icon

The current app icon (`public/icons/icon.svg`) is hand-coded vector SVG (two crossed orbital ellipses + a spark), deliberately geometric so it stays crisp at every size down to a 32px favicon. If you explore a refreshed version: **keep it as clean vector geometry, not a raster/photographic-style mark** — anything generated as a bitmap image needs to be traced back into clean SVG before it can ship as a PWA icon, or it will look soft/blurry exactly where a university-affiliated app most needs to look sharp (the home-screen icon, the browser tab). Refining the existing orbit-and-spark concept is preferred over an unrelated new mark, unless something genuinely stronger emerges.

## What to hand back for execution

For each hero moment (or whatever screens you design), please give:
1. A wireframe/mockup (image, HTML, or Figma-style description — any format works)
2. Which specific existing screen/component it replaces or extends (reference the file paths above where relevant, or describe the screen by name — "the Live Round final reveal," "the QR scan success screen," etc.)
3. Any new asset needed for it (image/video/sound) — see the prompt-generation guidance below for how to actually generate those
4. Anything you're deliberately leaving as-is (so it's clear what's new scope vs. untouched)

Once that's back, hand it to Claude Code for execution — file paths, exact component names, and the token table above are meant to make that handoff fast.
