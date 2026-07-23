# Wow-factor image/video prompts — Synergy

*Companion to `docs/design-brief.md`. Ready-to-adapt prompts for the 6 hero moments, using this project's real tokens. Paste the house style block into every prompt so everything reads as one family.*

## House style block (paste into every prompt)

```
Style: clean, modern, energetic — a mobile app for a university's club
engagement platform, NOT a children's game and NOT a corporate SaaS
dashboard. Palette: deep maroon/crimson (#BD3861) as the dominant accent
color, warm orange-red (#c7401a) used sparingly for danger/incorrect only,
green (#2e8659) for success/confirmation, warm ivory (#faf7f2) background,
near-black warm text (#2a2521). Motif: an atom / orbital-spark concept —
two crossed elliptical orbits with a small bolt or spark at the center —
reuse this shape language rather than an unrelated mascot. No text
rendered inside the image. No generic stock-photo energy (no lightbulbs,
no glowing brains, no floating gears). Feels premium but not corporate —
closer to a well-designed fintech or fitness app than a toy.
```

## 1. PWA install / first-open splash

**Static hero image or short (1-2s) loop:**
```
[house style block]
A single atom-orbit mark (two crossed elliptical rings, deep maroon
#BD3861, with a small warm spark/bolt at the exact center where the
orbits cross) mid-formation — as if the two rings are still settling into
place, with a faint trailing glow along their path. Centered composition,
generous negative space around it on a warm ivory background. Square
1:1 aspect ratio.
```
**If generating video**: a 1-2 second loop of the two rings settling into their final crossed position, ending on a held frame — not a constant spin (the current app already has a subtle rotation in code; the asset itself should read as arriving, not looping forever).

## 2. Live Round "Winner Declaration"

**Static celebratory burst (background layer behind existing confetti code):**
```
[house style block]
An abstract radial burst of light emanating from a central point,
deep maroon and warm gold-adjacent tones only (no rainbow), like an
explosion of energy captured mid-moment. Should read as triumphant and
sudden, not soft or dreamy. Suitable as a full-bleed background behind
white/light text and existing confetti particles. 9:16 vertical (phone
screen).
```

## 3. QR check-in success

**Static confirmation illustration:**
```
[house style block]
A simple, warm illustration of a checkmark or pulse-ring forming around
a small spark, communicating "confirmed" / "you're in" — friendly and
quick to read at a glance, not elaborate. Green (#2e8659) as the primary
color for this one specifically (breaks from the maroon-dominant rule
deliberately, since green already means "success" throughout this app).
Square 1:1, plenty of breathing room, works small (this renders at
roughly phone-screen-half-height).
```

## 4. Tier-up celebration (Ember → Volt → Current → Plasma)

**Four variants, one per tier, each using that tier's existing pastel token color as the accent (see `globals.css` `--tier-*` values) — otherwise identical composition:**
```
[house style block]
A small upward-motion burst — like a single spark leaping upward and
brightening — communicating "leveling up," personal and quiet rather
than the loud Winner Declaration burst above. Accent color: [substitute
the real tier's --tier-*-text hex]. Square 1:1, small/compact
composition (this renders inline in a toast/card, not full-screen).
```

## 5. Event Report submitted (Committee Member's moment)

**Static confirmation image:**
```
[house style block]
A simple illustration of a document or page with a checkmark, rendered
in the same atom/spark visual language rather than a literal clipart
document — e.g. a small page-shaped outline with a spark at one corner.
Communicates "your work is done and it mattered," warm and satisfying,
not corporate. Square 1:1.
```

## 6. Event Report downloaded / Professor's tracking view

No new hero image needed here — this moment is about *data feeling alive* (live-updating counts, real-time registration numbers), which is an animation/interaction design problem, not an asset-generation one. If a background texture is wanted for this screen, reuse the existing `energy-field.tsx` particle-network visual language rather than commissioning something new.

## How to use these with Google Labs / Veo / Imagen

1. Paste the house style block + the specific numbered prompt into your tool.
2. Generate 3-4 variations per prompt — pick the one that reads cleanest at small size (most of these render in a phone-sized card, not full-screen).
3. For video: keep clips under ~2 seconds and loop-friendly (no jump cut at the loop point) — this runs on real phones on real mobile data, so shorter and more compressed is always better than longer and higher-fidelity.
4. Save with a clear filename matching the moment (e.g. `splash-atom-form.mp4`, `tier-up-volt.png`) and hand the files + which moment each is for back to Claude Code for wiring in — no need to guess exact file paths, that's the execution step.

## What NOT to generate

- App icon, favicon, PWA manifest icons — already final (`public/icons/icon.svg` + generated PNGs).
- Gallery/event-cover placeholder illustrations — already built and in use.
- Anything for the homepage hero — `energy-field.tsx`/`hero-atom.tsx` already cover this, built as code (CSS/SVG), not image assets, specifically so they scale losslessly and cost nothing extra to load.
- Real event/club photos — those come from actual events, not generated art (a generated "photo" of a fake event would misrepresent something that didn't happen — this project has specifically avoided that trap before, see `docs/design-brief.md`'s reference to decision 41).
