# Jules — asset generation prompts (solarpunk expansion)

*Companion to `docs/prompts/image-gen.md`'s generic toolkit prompt, but pre-written specifically for this project instead of a template you fill in. Same house convention: every image gets a `FILE:` target path, a `RATIO:`, and a self-contained `PROMPT:`.*

**Count: 93 prompts across 13 groups** (92 images + 1 short video), including one bonus brand-kit board beyond the original inventory.

*Update: icons and logos were originally marked "skip, build as code" per `docs/prompts/image-gen.md`'s own gate — overridden here on explicit instruction. These tools output raster (PNG), not true vector paths — the icon/logo prompts are written for clean, flat, high-contrast shapes that hold up as PNGs at small size.*

*Two fixes applied throughout, both from real generation failures with ChatGPT:*
1. *Every prompt is now fully self-contained — no more "[same brief as X above]" shorthand. That phrasing got misread as an instruction to edit a reference image and blocked entire batches. Every prompt below repeats its full brief from scratch.*
2. *Every batch of prompts meant to be generated together now opens with an explicit instruction that they are N separate standalone images, not a collage or multi-panel composition — and that the N concepts should be meaningfully distinct from each other, not near-duplicates.*

---

## House style (the shared language every prompt below is built from)

Palette: void `#070b12`, card `#0d1620`, kumkum `#E34234` (emphasis), gold `#FFC72C` (energy/correct), success/verdant `#3ba26b`, plus two new companions — amber-dust `#C98A3E` and deep verdant-teal `#2E8B7A` (cosmetic rarity). Tier tones: ember `#d99a4e`, volt/current/plasma all read gold with escalating warmth.

Aesthetic: **solarpunk** — organic forms (vines, leaves, growth) fused with clean renewable-energy tech (circuits, sparks, atom-orbit rings), optimistic and warm, NOT dystopian neon-grime cyberpunk. Thin, confident line weight with rounded terminals, echoing the existing atom-spark mark (two crossed orbit rings + a bolt + one kumkum accent dot).

Avoid: generic AI-image cliches — no warm-cream-and-terracotta palette, no purple-to-blue gradient hero, no Inter/Space-Grotesk-flavored generic sans energy, no emoji-style icons, no stock-photo corporate people, no text baked into the image unless the block says otherwise.

---

## Group 1 — Avatar system

*Folder: `public/images/avatar/`, `public/images/avatar-items/`, `public/images/fx/`*

### 1.1–1.5 — Character concept turnaround (pick one before converting to 3D)

**Generate exactly 5 separate images in one batch. Each image must be a standalone file, not a collage or multi-panel composition. Keep the same overall brand style and constraints, but make all 5 concepts meaningfully different in composition, motif placement, visual flow, and intensity.**

```
FILE: concept/avatar-concept-1.png
RATIO: 3:4 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
3:4 portrait, do not output square or landscape, do not crop.
A full-body stylized 3D-render-style character, front-facing, standing
in a relaxed neutral A-pose against a FLAT SOLID #0d1620 background —
no scene, no props, no floor, nothing but the character and flat color,
since this image will be converted to an actual 3D mesh and busy
backgrounds break that conversion.
Subject: a small, friendly "spark spirit" — a young, energetic humanoid
character whose design language mixes organic solarpunk elements (a
leaf-and-vine motif woven through simple clothing) with a subtle glowing
energy core at the chest, faintly gold #FFC72C, echoing the Jules
brand's "atom generating a spark" idea. Rounded, approachable
proportions — not photorealistic, not scary, appropriate for a college
engagement app. This is concept 1 of 5 — a balanced, friendly baseline
design the other four variants will each diverge from differently.
Lighting: single soft frontal key light plus a faint gold rim light from
behind, consistent studio-turnaround lighting, no harsh shadows, no
dramatic color grading.
Line/material language: smooth stylized 3D-render surfaces, matte with a
few small emissive gold accents (the chest core, maybe fingertip sparks)
— not shiny/plastic, not painterly, not photoreal skin texture.
Avoid: props, background scenery, other characters, visible text/logos,
dynamic action poses, extreme stylization that would be hard to rig.
3:4 portrait, plain #0d1620 background, do not crop to square.
```

```
FILE: concept/avatar-concept-2.png
RATIO: 3:4 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
3:4 portrait, do not output square or landscape, do not crop.
A full-body stylized 3D-render-style character, front-facing, standing
in a relaxed neutral A-pose against a FLAT SOLID #0d1620 background —
no scene, no props, no floor, nothing but the character and flat color,
since this image will be converted to an actual 3D mesh and busy
backgrounds break that conversion.
Subject: a small, friendly "spark spirit" — a young, energetic humanoid
character whose design language mixes organic solarpunk elements (a
leaf-and-vine motif woven through simple clothing) with a subtle glowing
energy core at the chest, faintly gold #FFC72C, echoing the Jules
brand's "atom generating a spark" idea. This is concept 2 of 5: lean the
design toward a slightly more angular/geometric silhouette — sharper
shoulder lines, a more crystalline energy core — while keeping the same
warm, friendly, approachable face and rounded proportions as the family.
A deliberate alternative read on the brief, not a random restyle.
Lighting: single soft frontal key light plus a faint gold rim light from
behind, consistent studio-turnaround lighting, no harsh shadows, no
dramatic color grading.
Line/material language: smooth stylized 3D-render surfaces, matte with a
few small emissive gold accents (the chest core, maybe fingertip sparks)
— not shiny/plastic, not painterly, not photoreal skin texture.
Avoid: props, background scenery, other characters, visible text/logos,
dynamic action poses, extreme stylization that would be hard to rig.
3:4 portrait, plain #0d1620 background, do not crop to square.
```

```
FILE: concept/avatar-concept-3.png
RATIO: 3:4 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
3:4 portrait, do not output square or landscape, do not crop.
A full-body stylized 3D-render-style character, front-facing, standing
in a relaxed neutral A-pose against a FLAT SOLID #0d1620 background —
no scene, no props, no floor, nothing but the character and flat color,
since this image will be converted to an actual 3D mesh and busy
backgrounds break that conversion.
Subject: a small, friendly "spark spirit" — a young, energetic humanoid
character whose design language mixes organic solarpunk elements (a
leaf-and-vine motif woven through simple clothing) with a subtle glowing
energy core at the chest, faintly gold #FFC72C, echoing the Jules
brand's "atom generating a spark" idea. This is concept 3 of 5: lean the
design toward softer, rounder forms — more leaf/petal shapes worked into
the clothing silhouette, a softer glowing core, gentler color
transitions between gold and the character's base tone — the gentlest,
most approachable read in this set of 5.
Lighting: single soft frontal key light plus a faint gold rim light from
behind, consistent studio-turnaround lighting, no harsh shadows, no
dramatic color grading.
Line/material language: smooth stylized 3D-render surfaces, matte with a
few small emissive gold accents (the chest core, maybe fingertip sparks)
— not shiny/plastic, not painterly, not photoreal skin texture.
Avoid: props, background scenery, other characters, visible text/logos,
dynamic action poses, extreme stylization that would be hard to rig.
3:4 portrait, plain #0d1620 background, do not crop to square.
```

```
FILE: concept/avatar-concept-4.png
RATIO: 3:4 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
3:4 portrait, do not output square or landscape, do not crop.
A full-body stylized 3D-render-style character, front-facing, standing
in a relaxed neutral A-pose against a FLAT SOLID #0d1620 background —
no scene, no props, no floor, nothing but the character and flat color,
since this image will be converted to an actual 3D mesh and busy
backgrounds break that conversion.
Subject: a small, friendly "spark spirit" — a young, energetic humanoid
character whose design language mixes organic solarpunk elements (a
leaf-and-vine motif woven through simple clothing) with a subtle glowing
energy core at the chest, faintly gold #FFC72C, echoing the Jules
brand's "atom generating a spark" idea. This is concept 4 of 5: add one
small signature accessory that reads as "energy club member" — a simple
circuit-patterned sash or armband in kumkum #E34234, the only place
kumkum appears on the character, everywhere else stays gold/neutral —
the one variant in this set with a second accent color.
Lighting: single soft frontal key light plus a faint gold rim light from
behind, consistent studio-turnaround lighting, no harsh shadows, no
dramatic color grading.
Line/material language: smooth stylized 3D-render surfaces, matte with a
few small emissive gold accents (the chest core, maybe fingertip sparks)
— not shiny/plastic, not painterly, not photoreal skin texture.
Avoid: props, background scenery, other characters, visible text/logos,
dynamic action poses, extreme stylization that would be hard to rig.
3:4 portrait, plain #0d1620 background, do not crop to square.
```

```
FILE: concept/avatar-concept-5.png
RATIO: 3:4 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
3:4 portrait, do not output square or landscape, do not crop.
A full-body stylized 3D-render-style character, front-facing, standing
in a relaxed neutral A-pose against a FLAT SOLID #0d1620 background —
no scene, no props, no floor, nothing but the character and flat color,
since this image will be converted to an actual 3D mesh and busy
backgrounds break that conversion.
Subject: a small, friendly "spark spirit" — a young, energetic humanoid
character whose design language mixes organic solarpunk elements (a
leaf-and-vine motif woven through simple clothing) with a subtle glowing
energy core at the chest, faintly gold #FFC72C, echoing the Jules
brand's "atom generating a spark" idea. This is concept 5 of 5, the
boldest read in the set: make the energy core and any glowing accents
noticeably larger and more prominent than the other four variants — a
deliberate contrast point to weigh against the more restrained designs
when picking the final direction.
Lighting: single soft frontal key light plus a faint gold rim light from
behind, consistent studio-turnaround lighting, no harsh shadows, no
dramatic color grading.
Line/material language: smooth stylized 3D-render surfaces, matte with a
few small emissive gold accents (the chest core, maybe fingertip sparks)
— not shiny/plastic, not painterly, not photoreal skin texture.
Avoid: props, background scenery, other characters, visible text/logos,
dynamic action poses, extreme stylization that would be hard to rig.
3:4 portrait, plain #0d1620 background, do not crop to square.
```

### 1.6–1.9 — Reduced-motion fallback stills (one per tier, once a design is picked)

**Generate exactly 4 separate images in one batch. Each image must be a standalone file, not a collage or multi-panel composition. Keep the same character design, pose, and pedestal treatment across all 4, but make the tier recoloring and lighting intensity meaningfully different so the four read as a clear progression, not near-duplicates.**

```
FILE: public/images/avatar/fallback-ember.webp
RATIO: 3:4 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
3:4 portrait, do not output square or landscape, do not crop.
The chosen avatar character design (a small, friendly stylized "spark
spirit," solarpunk-styled with an organic leaf-and-vine motif woven
through its clothing and a glowing energy core at the chest) rendered as
a clean, front-facing hero still, standing on a simple circular pedestal
with a soft gold glow underneath. Background: a dark, softly blurred
atmospheric gradient from #16324a at the top through #0d1620 to #070b12
at the edges — NOT a busy scene, just soft depth.
This is the EMBER tier variant: recolor the character's energy-core and
any emissive accents to the ember palette #d99a4e (warm amber-orange).
Lighting: soft frontal key plus a warm rim light matching the ember
tone. This image is a static fallback shown to users with reduced-motion
preferences enabled, replacing a live 3D scene — it needs to read as a
complete, satisfying "hero shot" on its own.
Avoid: text, UI chrome, other characters, busy background detail.
3:4 portrait, soft dark gradient background, do not crop to square.
```

```
FILE: public/images/avatar/fallback-volt.webp
RATIO: 3:4 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
3:4 portrait, do not output square or landscape, do not crop.
The chosen avatar character design (a small, friendly stylized "spark
spirit," solarpunk-styled with an organic leaf-and-vine motif woven
through its clothing and a glowing energy core at the chest) rendered as
a clean, front-facing hero still, standing on a simple circular pedestal
with a soft gold glow underneath. Background: a dark, softly blurred
atmospheric gradient from #16324a at the top through #0d1620 to #070b12
at the edges — NOT a busy scene, just soft depth.
This is the VOLT tier variant: recolor the energy core and emissive
accents to #FFC72C gold, slightly brighter and more electric than the
ember version. Keep pose, pedestal, and lighting setup consistent with
the rest of this four-image tier set.
Avoid: text, UI chrome, other characters, busy background detail.
3:4 portrait, soft dark gradient background, do not crop to square.
```

```
FILE: public/images/avatar/fallback-current.webp
RATIO: 3:4 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
3:4 portrait, do not output square or landscape, do not crop.
The chosen avatar character design (a small, friendly stylized "spark
spirit," solarpunk-styled with an organic leaf-and-vine motif woven
through its clothing and a glowing energy core at the chest) rendered as
a clean, front-facing hero still, standing on a simple circular pedestal
with a soft gold glow underneath. Background: a dark, softly blurred
atmospheric gradient from #16324a at the top through #0d1620 to #070b12
at the edges — NOT a busy scene, just soft depth.
This is the CURRENT tier variant: the energy core and accents stay gold
#FFC72C, but add a thin kumkum #E34234 outline or edge-glow around the
core, marking this as a more advanced tier than Volt without changing
the overall color family. Keep pose and lighting consistent with the
rest of this four-image tier set.
Avoid: text, UI chrome, other characters, busy background detail.
3:4 portrait, soft dark gradient background, do not crop to square.
```

```
FILE: public/images/avatar/fallback-plasma.webp
RATIO: 3:4 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
3:4 portrait, do not output square or landscape, do not crop.
The chosen avatar character design (a small, friendly stylized "spark
spirit," solarpunk-styled with an organic leaf-and-vine motif woven
through its clothing and a glowing energy core at the chest) rendered as
a clean, front-facing hero still, standing on a simple circular pedestal
with a soft gold glow underneath. Background: a dark, softly blurred
atmospheric gradient from #16324a at the top through #0d1620 to #070b12
at the edges — NOT a busy scene, just soft depth.
This is the PLASMA tier variant, the highest tier: the energy core burns
brightest gold #FFC72C with visible small spark particles drifting off
it, and the pedestal glow is noticeably larger and more intense than the
other three tiers. This should read as clearly the most impressive image
in the four-image tier set when compared side by side.
Avoid: text, UI chrome, other characters, busy background detail.
3:4 portrait, soft dark gradient background, do not crop to square.
```

### 1.10 — Dashboard teaser image

```
FILE: public/images/avatar/dashboard-teaser.webp
RATIO: 4:3 landscape — do not output square or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
4:3 landscape, do not output square or portrait, do not crop.
The chosen avatar character design (a small, friendly stylized "spark
spirit," solarpunk-styled, glowing gold energy core, current-tier
coloring) standing on a simple circular pedestal with a soft gold glow,
positioned in the LEFT two-thirds of the frame, leaving open negative
space in the right third — dark and softly gradient, since a "View your
character" call-to-action link sits over that area in the real UI.
Background: a dark, softly blurred atmospheric gradient from #16324a at
the top through #0d1620 to #070b12 at the edges.
This is a small teaser card image on the student dashboard, not a full
hero moment — keep it visually calm and restrained rather than
maximally dramatic.
Avoid: text, UI chrome, busy background, other characters.
4:3 landscape, dark gradient background with open space on the right
third, do not crop to square or portrait.
```

### 1.11–1.17 — Cosmetic item icon renders

**Generate exactly 7 separate images in one batch. Each image must be a standalone file, not a collage or multi-panel composition. Keep the same isolated-object rendering style and lighting across all 7, but make each item's shape, color, and level of visual elaboration clearly distinct from the others, escalating from the simplest item to the most elaborate.**

```
FILE: public/images/avatar-items/sprout-wrap.webp
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small stylized item-icon render, centered, floating against a
FLAT #101c28 background (no scene, no shadow catcher beyond a soft
contact shadow directly under the object) — matching the style of a
game-inventory icon (a simple 3D-rendered object, isolated, clean).
Subject: "Sprout Wrap" — a simple woven outfit/garment piece with small
leaf and vine details, rendered in warm success-green #3ba26b as the
dominant color with a subtle gold #FFC72C trim or stitch detail.
Lighting: soft three-point studio lighting, gentle rim light, no harsh
specular highlights, no dramatic shadows.
Style: smooth stylized 3D-render surfacing, matte, slightly soft.
This is the STARTING item (unlocked at 0 Joules) — it should read as
simple and humble compared to later, higher-tier items in this same
seven-item set.
Avoid: text, other objects in frame, busy background, a human figure.
1:1 square, flat #101c28 background, do not crop.
```

```
FILE: public/images/avatar-items/ember-circlet.webp
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small stylized item-icon render, centered, floating against a
FLAT #101c28 background (soft contact shadow only, no scene) — matching
the style of a game-inventory icon, simple 3D-rendered object, isolated,
clean.
Subject: "Ember Circlet" — a simple head-worn circlet/band with a small
central gem, rendered in the ember tier tone #d99a4e (warm amber-orange)
as the dominant color, with a faint inner glow suggesting warmth.
Lighting: soft three-point studio lighting, gentle rim light, no harsh
specular highlights, no dramatic shadows.
Style: smooth stylized 3D-render surfacing, matte, slightly soft, the
same rendering technique across this whole seven-item set.
Unlocked at 150 lifetime Joules — slightly more special-feeling than
Sprout Wrap, but still an early-tier item.
Avoid: text, other objects in frame, busy background, a human figure.
1:1 square, flat #101c28 background, do not crop.
```

```
FILE: public/images/avatar-items/volt-charm.webp
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small stylized item-icon render, centered, floating against a
FLAT #101c28 background (soft contact shadow only, no scene) — matching
the style of a game-inventory icon, simple 3D-rendered object, isolated,
clean.
Subject: "Volt Charm" — a small pendant/charm accessory shaped like a
simplified lightning-bolt-in-a-circle, rendered in bright gold #FFC72C
with a visible small emissive glow at its core, since this is meant to
feel like a genuine little energy source.
Lighting: soft three-point studio lighting, gentle rim light, no harsh
specular highlights, no dramatic shadows.
Style: smooth stylized 3D-render surfacing, matte, slightly soft, the
same rendering technique across this whole seven-item set.
Unlocked at 350 lifetime Joules.
Avoid: text, other objects in frame, busy background, a human figure.
1:1 square, flat #101c28 background, do not crop.
```

```
FILE: public/images/avatar-items/current-cloak.webp
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small stylized item-icon render, centered, floating against a
FLAT #101c28 background (soft contact shadow only, no scene) — matching
the style of a game-inventory icon, simple 3D-rendered object, isolated,
clean.
Subject: "Current Cloak" — a flowing outfit/cloak piece, dominant color
gold #FFC72C with kumkum #E34234 accents along the edge/hem (a thin
glowing trim), suggesting a more advanced, higher-energy garment than
Sprout Wrap.
Lighting: soft three-point studio lighting, gentle rim light, no harsh
specular highlights, no dramatic shadows.
Style: smooth stylized 3D-render surfacing, matte, slightly soft, the
same rendering technique across this whole seven-item set.
Unlocked at 600 lifetime Joules — should read as visibly more elaborate
and premium than the two lower-tier items in this set.
Avoid: text, other objects in frame, busy background, a human figure.
1:1 square, flat #101c28 background, do not crop.
```

```
FILE: public/images/avatar-items/spark-aura.webp
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small stylized item-icon render, centered, floating against a
FLAT #101c28 background (soft contact shadow only, no scene) — matching
the style of a game-inventory icon.
Subject: "Spark Aura" — this is an EFFECT-slot item, not a physical
object, so render it as a small radiant burst of glowing gold #FFC72C
particles/sparks arranged in a pleasing circular halo shape, with soft
glow/bloom around the brightest points, floating in place (no object at
the center — the particles ARE the item).
Lighting: soft ambient glow radiating from within the particle burst
itself rather than an external key light.
Style: smooth stylized 3D-render surfacing, matte, slightly soft, the
same rendering technique across this whole seven-item set.
Unlocked at 800 lifetime Joules.
Avoid: text, other objects in frame, busy background, a human figure.
1:1 square, flat #101c28 background, do not crop.
```

```
FILE: public/images/avatar-items/plasma-crown.webp
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small stylized item-icon render, centered, floating against a
FLAT #101c28 background (soft contact shadow only, no scene) — matching
the style of a game-inventory icon, simple 3D-rendered object, isolated,
clean.
Subject: "Plasma Crown" — a more elaborate head-worn crown/circlet than
Ember Circlet, rendered in bright gold #FFC72C with small visible spark
particles drifting off its points, a brighter and more intense glow than
any lower item in the set.
Lighting: soft three-point studio lighting, gentle rim light, no harsh
specular highlights, no dramatic shadows.
Style: smooth stylized 3D-render surfacing, matte, slightly soft, the
same rendering technique across this whole seven-item set.
Unlocked at 1,000 lifetime Joules — this should read as clearly the most
impressive HAT-slot item in the whole collection.
Avoid: text, other objects in frame, busy background, a human figure.
1:1 square, flat #101c28 background, do not crop.
```

```
FILE: public/images/avatar-items/atom-orbit-ring.webp
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small stylized item-icon render, centered, floating against a
FLAT #101c28 background (soft contact shadow only, no scene) — matching
the style of a game-inventory icon, simple 3D-rendered object, isolated,
clean.
Subject: "Atom Orbit Ring" — an accessory shaped like two crossed thin
orbit rings (a direct echo of the Jules brand mark's atom-orbit motif)
with a single small glowing kumkum #E34234 point where the rings
intersect, otherwise rendered in gold #FFC72C.
Lighting: soft three-point studio lighting, gentle rim light, no harsh
specular highlights, no dramatic shadows.
Style: smooth stylized 3D-render surfacing, matte, slightly soft, the
same rendering technique across this whole seven-item set.
Unlocked at 1,200 lifetime Joules — the highest-tier item currently
seeded, should feel like a genuine "capstone" reward, the most refined
and premium-feeling render in the whole set.
Avoid: text, other objects in frame, busy background, a human figure.
1:1 square, flat #101c28 background, do not crop.
```

### 1.18–1.19 — Rarity effect textures

**Generate exactly 2 separate images in one batch. Each image must be a standalone file, not a collage or multi-panel composition. Keep the same soft light-bloom texture technique for both, but make the color and intensity clearly distinct so one reads as a lower rarity tier and the other as the higher tier.**

```
FILE: public/images/fx/aura-rare.webp
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A soft, glowing particle/light texture meant to sit BEHIND or AROUND a
character as an overlay effect — not an object, a pure light/energy
texture. Dominant color: amber-dust #C98A3E, rendered as a soft radial
bloom of warm light with a handful of small drifting spark particles,
fading to fully transparent at the edges of the frame (the background
outside the glow should read as pure black so it can be used as an
additive/screen-blend overlay in code).
Style: soft, painterly light bloom — a lens-flare-adjacent glow
texture, not a hard-edged graphic. This represents "rare" rarity
cosmetic items in the avatar system, one step below the top epic tier —
keep the bloom radius and particle count modest compared to the epic
version in this two-image set.
Avoid: any solid object, text, a character, a hard-edged shape.
1:1 square, pure black background outside the glow, do not crop.
```

```
FILE: public/images/fx/aura-epic.webp
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A soft, glowing particle/light texture meant to sit BEHIND or AROUND a
character as an overlay effect — not an object, a pure light/energy
texture. Dominant color: deep verdant-teal #2E8B7A, rendered as a soft
radial bloom of cool-warm light with several small drifting spark
particles, fading to fully transparent at the edges of the frame (the
background outside the glow should read as pure black so it can be used
as an additive/screen-blend overlay in code).
Style: soft, painterly light bloom — a lens-flare-adjacent glow
texture, not a hard-edged graphic. This represents "epic" rarity, the
top tier, so make the bloom radius larger and the particle count higher
than the rare version in this two-image set — it should read as visibly
more intense when compared side by side.
Avoid: any solid object, text, a character, a hard-edged shape.
1:1 square, pure black background outside the glow, do not crop.
```

---

## Group 2 — Motifs & patterns

*Folder: `public/images/patterns/`*

**Generate exactly 5 separate images in one batch. Each image must be a standalone file, not a collage or multi-panel composition. Keep the same tileable pattern technique across all 5, but make the color, density, and context (public site / admin / mobile) meaningfully distinct.**

```
FILE: public/images/patterns/circuit-vine.webp
RATIO: 1:1 square, seamlessly tileable — do not output landscape or portrait
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, SEAMLESSLY TILEABLE pattern — the left edge must continue
into the right edge and the top edge into the bottom edge with no
visible seam, do not output landscape or portrait, do not crop.
Subject: a repeating line-art pattern where organic vine/leaf tendrils
gradually resolve into clean geometric circuit traces and small node
dots — the literal visual expression of "solarpunk" (nature merging
into clean energy technology), rendered as thin, consistent-weight
lines with rounded terminals, matching the Jules brand mark's line
language.
Color: lines in gold #FFC72C at low opacity (roughly 15-20% strength)
against a flat #070b12 background — this needs to sit quietly BEHIND
other content, not compete with it, so keep contrast deliberately low.
This is the BASE version of a five-pattern set (two color variants and
two zone-specific variants follow) — moderate density, visible on close
inspection, reads as a subtle texture from normal viewing distance.
Avoid: text, high contrast, large focal shapes, anything that would
distract from foreground UI content sitting on top of this pattern.
1:1 square, seamlessly tileable, no visible seam at any edge,
low-contrast gold-on-void, do not crop.
```

```
FILE: public/images/patterns/circuit-vine-gold.webp
RATIO: 1:1 square, seamlessly tileable — do not output landscape or portrait
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, SEAMLESSLY TILEABLE pattern, no visible seam at any edge, do
not output landscape or portrait, do not crop.
Subject: a repeating line-art pattern where organic vine/leaf tendrils
gradually resolve into clean geometric circuit traces and small node
dots — thin, consistent-weight lines with rounded terminals, matching
the Jules brand mark's line language.
Color: this is the GOLD-forward variant of a five-pattern set — push the
line color to a warmer, brighter gold #FFC72C at around 20-25% opacity,
marginally more visible than the base version, against a flat #070b12
background. Intended for use behind gold-forward content (Surge Mode,
general celebratory sections).
Avoid: text, high contrast, large focal shapes.
1:1 square, seamlessly tileable, no visible seam, do not crop.
```

```
FILE: public/images/patterns/circuit-vine-kumkum.webp
RATIO: 1:1 square, seamlessly tileable — do not output landscape or portrait
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, SEAMLESSLY TILEABLE pattern, no visible seam at any edge, do
not output landscape or portrait, do not crop.
Subject: a repeating line-art pattern where organic vine/leaf tendrils
gradually resolve into clean geometric circuit traces and small node
dots — thin, consistent-weight lines with rounded terminals, matching
the Jules brand mark's line language.
Color: this is the KUMKUM-forward variant of a five-pattern set —
recolor the line work to kumkum #E34234 at around 15-20% opacity against
a flat #070b12 background. Intended for use behind Live Round's
kumkum-chrome sections (already visually distinct from async Surge Mode
elsewhere in the app).
Avoid: text, high contrast, large focal shapes.
1:1 square, seamlessly tileable, no visible seam, do not crop.
```

```
FILE: public/images/patterns/admin-blueprint.webp
RATIO: 1:1 square, seamlessly tileable — do not output landscape or portrait
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, SEAMLESSLY TILEABLE pattern, no visible seam at any edge, do
not output landscape or portrait, do not crop.
Subject: a faint technical "blueprint" grid texture — thin graph-paper
style grid lines with occasional small schematic annotations (simple
circuit-node dots, faint measurement tick marks) reinforcing the admin
area's "Reactor Command Center" identity — a control-room feel, not a
decorative one. This is a different visual family from the other four
patterns in this set (grid, not vine).
Color: lines in muted steel-blue #6e8aa3 at very low opacity (10-15%)
against flat #070b12 — this must stay extremely quiet, since admin users
need this background for daily operational glancing, not visual noise.
Avoid: text, bright colors, any shape large or bold enough to draw focus
away from real admin content sitting on top.
1:1 square, seamlessly tileable, no visible seam, very low contrast, do
not crop.
```

```
FILE: public/images/patterns/node-subtle.webp
RATIO: 1:1 square, seamlessly tileable — do not output landscape or portrait
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, SEAMLESSLY TILEABLE pattern, no visible seam at any edge, do
not output landscape or portrait, do not crop.
Subject: an extremely minimal, almost-invisible texture — just a
handful of tiny gold #FFC72C dots (representing distant "spark" points)
scattered sparsely across a flat #070b12 field, at very low opacity
(under 10%). This is the sparsest, quietest pattern in the five-image
set, by far — no line work at all, just isolated dots.
This is for the mobile student PWA specifically, which must stay
performance-lean for quiz integrity — the texture should be barely
perceptible, adding a hint of depth without any visual weight at all.
Avoid: any line work, any pattern dense enough to look "busy" at a
glance, anything that would read as a texture rather than near-nothing.
1:1 square, seamlessly tileable, no visible seam, extremely low density
and opacity, do not crop.
```

---

## Group 3 — Illustration set

*Folder: `public/images/illustrations/`*

**Generate exactly 9 separate images in one batch. Each image must be a standalone file, not a collage or multi-panel composition. Keep the same soft flat-illustration style and line weight across all 9, but make each subject's shape, meaning, and mood clearly distinct.**

```
FILE: public/images/illustrations/empty-surges.webp
RATIO: 4:3 landscape — do not output square or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
4:3 landscape, do not output square or portrait, do not crop.
A soft, minimal flat-illustration (not photoreal, not 3D-render — a
different, gentler register than the avatar assets, since this is a
quiet empty-state moment) depicting a single dormant/sleeping stylized
atom shape — two crossed thin orbit rings around a small dim core,
echoing the Jules brand mark but shown "resting," not active — sitting
alone in soft negative space.
Palette: muted #5c7690 line work on a flat #0d1620 background, with just
one small warm gold #FFC72C highlight on the core to suggest potential
energy rather than emptiness. Composition: the shape sits slightly
left-of-center, generous open space around it (this illustration sits
above "No surges yet" text in the real UI, so leave clear room below).
Mood: calm and inviting, not sad or broken — an empty state should read
as "nothing here yet," not "something went wrong."
Avoid: text, human figures, bright saturated colors, clutter.
4:3 landscape, generous negative space below the subject, do not crop.
```

```
FILE: public/images/illustrations/empty-events.webp
RATIO: 4:3 landscape — do not output square or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
4:3 landscape, do not output square or portrait, do not crop.
A soft, minimal flat-illustration in the same restrained line-art style
as the rest of this empty-state set — muted #5c7690 line work on a flat
#0d1620 background, one small warm gold #FFC72C highlight, calm and
inviting mood, generous negative space below the subject (real "No
events yet" text sits underneath in the UI).
Subject: a single small sprouting seedling/sprout shape — two simple
curved leaves emerging from a small mound — representing "nothing
planted/scheduled yet" for the events calendar's empty state, a hopeful
rather than sad image.
Avoid: text, human figures, bright saturated colors, clutter.
4:3 landscape, generous negative space below the subject, do not crop.
```

```
FILE: public/images/illustrations/empty-scans.webp
RATIO: 4:3 landscape — do not output square or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
4:3 landscape, do not output square or portrait, do not crop.
A soft, minimal flat-illustration in the same restrained line-art style
as the rest of this empty-state set — muted #5c7690 line work on a flat
#0d1620 background, calm and inviting mood, generous negative space
below the subject.
Subject: a simple QR-code-like square grid shape with one small gold
#FFC72C spark detail at a corner, suggesting "ready to scan, nothing
scanned yet" — for the admin Grid Station's empty recent-scans state.
Avoid: text, human figures, bright saturated colors, clutter.
4:3 landscape, generous negative space below the subject, do not crop.
```

```
FILE: public/images/illustrations/empty-vault-search.webp
RATIO: 4:3 landscape — do not output square or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
4:3 landscape, do not output square or portrait, do not crop.
A soft, minimal flat-illustration in the same restrained line-art style
as the rest of this empty-state set — muted #5c7690 line work on a flat
#0d1620 background, calm and inviting mood, generous negative space
below the subject.
Subject: a simple magnifying-glass shape with a small dimmed atom motif
inside the lens (rather than nothing), suggesting "searched, found
nothing yet" for the Student Data Vault's no-results state — should read
as neutral, not alarming, since this appears during normal admin
searching.
Avoid: text, human figures, bright saturated colors, clutter, alarming
or error-coded coloring.
4:3 landscape, generous negative space below the subject, do not crop.
```

```
FILE: public/images/illustrations/empty-afterglow.webp
RATIO: 4:3 landscape — do not output square or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
4:3 landscape, do not output square or portrait, do not crop.
A soft, minimal flat-illustration in the same restrained line-art style
as the rest of this empty-state set — muted #5c7690 line work on a flat
#0d1620 background, calm and inviting mood, generous negative space
below the subject.
Subject: a simple open-book or folded-note shape with a small gold
#FFC72C spark rising from its pages, suggesting "no recaps written yet"
for the public Afterglow list's empty state — inviting rather than
apologetic.
Avoid: text, human figures, bright saturated colors, clutter.
4:3 landscape, generous negative space below the subject, do not crop.
```

```
FILE: public/images/illustrations/empty-gallery.webp
RATIO: 4:3 landscape — do not output square or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
4:3 landscape, do not output square or portrait, do not crop.
A soft, minimal flat-illustration in the same restrained line-art style
as the rest of this empty-state set — muted #5c7690 line work on a flat
#0d1620 background, calm and inviting mood, generous negative space
below the subject.
Subject: a simple picture-frame outline containing a scattered "energy
grid" node motif — small dots connected by thin lines, a deterministic
scattered pattern — instead of a blank frame, representing "no photos
yet" for the public Gallery's empty state. Still honest about being an
illustration, not a faked photo.
Avoid: text, human figures, bright saturated colors, clutter, anything
resembling an actual photograph.
4:3 landscape, generous negative space below the subject, do not crop.
```

```
FILE: public/images/illustrations/first-spark.webp
RATIO: 4:3 landscape — do not output square or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
4:3 landscape, do not output square or portrait, do not crop.
A commemorative, slightly more celebratory illustration than the six
empty-state images in this set (this marks a genuine milestone — a
student's very first logged activity) — a single bright gold #FFC72C
spark/ember, rendered mid-ignition with a few small trailing light
particles, set against a softly warm dark gradient background from
#1c140a (ember tier tone) to #070b12. The spark should feel like a warm,
quiet "first moment," not a loud fireworks burst — this is a personal
milestone card, not a group celebration.
Style: soft flat illustration matching the empty-state set's line
language, just warmer and slightly more luminous.
Avoid: text, human figures, generic AI-cliche sparkle/confetti bursts.
4:3 landscape, warm dark gradient background, do not crop.
```

```
FILE: public/images/illustrations/connection.webp
RATIO: 4:3 landscape — do not output square or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
4:3 landscape, do not output square or portrait, do not crop.
An illustration for the student signup flow's "Connection" screen (a
connection-strength meter fills as a student completes their signup
form) — depict two small stylized nodes reaching toward each other with
a thin, partially-completed circuit/spark line between them (not fully
connected yet, suggesting "in progress"), in the same muted #5c7690
line-art style as the rest of this illustration set, with the gap
between the two nodes highlighted in gold #FFC72C to show where
connection is forming.
Flat #0d1620 background, generous negative space, calm and encouraging
mood — this sits above a real form, not a celebration moment.
Avoid: text, human figures, a completed/closed circuit (it should read
as "in progress," matching the meter's own partial-fill state).
4:3 landscape, generous negative space, do not crop.
```

```
FILE: public/images/illustrations/not-found.webp
RATIO: 4:3 landscape — do not output square or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
4:3 landscape, do not output square or portrait, do not crop.
A 404/not-found illustration in the same soft flat-illustration register
as the rest of this set — a single stylized atom-orbit shape (echoing
the brand mark) drawn with one ring visibly broken/incomplete, rendered
in muted #5c7690 line work with one small gold #FFC72C spark drifting
away from the broken point, on a flat #0d1620 background. The mood
should be gentle and a little playful, not alarming or broken-feeling —
this is a mis-typed URL, not a real error.
Avoid: text, human figures, red/error-coded coloring (kumkum should NOT
appear here — that color means something else in this system).
4:3 landscape, generous negative space, do not crop.
```

---

## Group 4 — Season & archive

*Folder: `public/images/illustrations/`*

```
FILE: public/images/illustrations/season-banner.webp
RATIO: 16:9 landscape — do not output square or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
16:9 landscape, do not output square or portrait, do not crop.
A wide banner illustration for the Catalyst Records archive's season
hero card — depict a stylized "energy field at scale": a particle-network
motif (small gold #FFC72C nodes connected by thin lines, deterministic
scattered pattern) arranged to suggest a sweeping landscape or horizon
line, denser and brighter toward the bottom-center, fading into the flat
#070b12 background toward the top and edges.
Mood: expansive and a little triumphant — this represents an entire
season's worth of collective energy/participation, so it should feel
bigger in scope than the small empty-state illustrations, without
becoming a busy or literal scene (no characters, no specific objects).
Avoid: text (the season name/dates render in code on top of this),
human figures, any single dominant focal object.
16:9 landscape, dense-toward-bottom particle field fading to flat void
at the top, do not crop.
```

---

## Group 5 — FX & motion concepts

*Folder: `public/images/fx/` (flame stages are final assets; the button/progress/spinner concepts are scratchpad-only reference for me to build as real CSS/SVG components)*

```
FILE: concept/quiz-button-states.png
RATIO: 16:9 landscape — do not output square or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
16:9 landscape, do not output square or portrait, do not crop.
A single reference sheet showing FOUR small crystal/gem-faceted button
shapes side by side, evenly spaced, distinguishable by their visual state
alone (no text needed inside the shapes themselves) — this is a
material/shape concept sheet, not final UI, so focus on shape and
surface quality over polish.
Shape language: rounded-hexagon or soft-faceted-crystal silhouette (not
a plain rectangle), each with a subtle beveled/faceted surface catching
light, matching a game-like energy.
States (left to right): 1) DEFAULT — flat #101c28 surface, thin #1c2836
border. 2) SELECTED — same shape with a gold #FFC72C glowing border and
a subtle inner highlight. 3) CORRECT — the shape glowing success green
#3ba26b with a soft outward bloom. 4) INCORRECT — the shape glowing
kumkum #E34234 with the same soft outward bloom treatment as correct.
Background: flat #070b12 behind all four.
Avoid: text, icons inside the shapes, drop shadows unrelated to the glow.
16:9 landscape, four shapes evenly spaced left to right, do not crop.
```

```
FILE: concept/progress-bar-charging.png
RATIO: 16:9 landscape — do not output square or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
16:9 landscape, do not output square or portrait, do not crop.
A single wide reference image of a horizontal progress-bar concept at
roughly 60% fill, styled as a "charging circuit" rather than a plain
flat bar — the filled portion should look like a glowing gold #FFC72C
energy channel with a few small bright pulse-points along its length
(suggesting current flowing through it), while the unfilled remainder is
a simple dark #1c2836 track. Rounded pill-shaped ends.
This concept feeds a real animated CSS/SVG component (the fill and pulse
points will move in code) — the generated image just needs to establish
the visual language (glow intensity, pulse-point size/spacing, track
color) clearly enough to build from.
Background: flat #070b12.
Avoid: text, numbers, percentage labels baked into the image.
16:9 landscape, single horizontal bar centered, do not crop.
```

```
FILE: concept/loading-spinner.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single reference image of a branded loading-spinner concept: a small
stylized atom shape (echoing the brand mark's two crossed orbit rings)
with one ring rendered as a glowing gold #FFC72C partial arc (roughly
270 degrees, suggesting motion/rotation) and the rest of the shape in
muted #1c2836 outline — this concept feeds a real CSS/SVG animation
where the gold arc rotates continuously, so the still image just needs
to establish the shape, proportions, and glow intensity clearly.
Background: flat #070b12, centered composition, generous surrounding
negative space (this renders small in real use, roughly 24-40px).
Avoid: text, a full completed ring (the gap is intentional — it implies
rotation), busy detail that would disappear at small size.
1:1 square, centered, generous negative space, do not crop.
```

**Generate exactly 4 separate images in one batch (the flame stages below). Each image must be a standalone file, not a collage or multi-panel composition. Keep the same isolated-flame rendering style across all 4, but escalate size, brightness, and particle detail clearly from stage 1 to stage 4.**

```
FILE: public/images/fx/flame-1.webp
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small stylized flame shape, isolated on a flat #101c28
background (no scene, no character) — soft painterly rendering rather
than a flat vector icon. This is STAGE 1 of 4 in a streak-intensity
sequence: render this as a small, low, gently flickering ember flame in
the ember tier tone #d99a4e, modest in size — this represents a short
streak (a day or two), so it should read as "just started," the least
intense flame in this four-image set.
Avoid: text, numbers, a character or hand holding the flame.
1:1 square, flat #101c28 background, do not crop.
```

```
FILE: public/images/fx/flame-2.webp
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small stylized flame shape, isolated on a flat #101c28
background (no scene, no character) — soft painterly rendering. This is
STAGE 2 of 4 in a streak-intensity sequence: a noticeably larger and
brighter flame than stage 1, transitioning color from ember #d99a4e
toward gold #FFC72C, with slightly more visible motion/flicker detail —
represents a growing streak, meaningfully bigger than stage 1 when
compared side by side.
Avoid: text, numbers, a character or hand holding the flame.
1:1 square, flat #101c28 background, do not crop.
```

```
FILE: public/images/fx/flame-3.webp
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small stylized flame shape, isolated on a flat #101c28
background (no scene, no character) — soft painterly rendering. This is
STAGE 3 of 4 in a streak-intensity sequence: a confidently sized, bright
gold #FFC72C flame with a few small ember particles drifting upward off
the tip, clearly bigger and more energetic than stage 2 — represents a
well-established streak.
Avoid: text, numbers, a character or hand holding the flame.
1:1 square, flat #101c28 background, do not crop.
```

```
FILE: public/images/fx/flame-4.webp
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small stylized flame shape, isolated on a flat #101c28
background (no scene, no character) — soft painterly rendering. This is
STAGE 4 of 4, the maximum stage in a streak-intensity sequence: the
largest and brightest flame in the set, gold #FFC72C with a visible
kumkum #E34234 hint at its hottest inner core, several small ember
particles drifting off it — this should unambiguously read as the most
impressive flame when all four stages are compared side by side,
representing a long, dedicated streak.
Avoid: text, numbers, a character or hand holding the flame.
1:1 square, flat #101c28 background, do not crop.
```

---

## Group 6 — Gallery stand-ins

*No fixed repo path — generate, then upload manually through the existing `/admin/gallery` page. Suggested working filenames below are just for your own folder organization before upload.*

**Generate exactly 5 separate images in one batch. Each image must be a standalone file, not a collage or multi-panel composition. Keep the same natural documentary photo-real style and color grading across all 5, but make the subject/setting of each meaningfully different (a meeting, a workshop, a check-in, a talk, a candid moment).**

```
FILE: working/gallery-standin-1.jpg
RATIO: 4:5 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
4:5 portrait, do not output square or landscape, do not crop.
A natural, photo-real (not illustrated) documentary-style photograph of
a small college club meeting: a handful of students seated around a
table in an ordinary classroom or common-room setting, engaged in
conversation, warm ambient indoor lighting, candid rather than posed.
Color grading: pull the overall image about 10% toward neutral/
desaturated (saturate ~0.9) and slightly cool the shadows, so it will
sit naturally against a dark solar-blue palette once placed in the UI,
rather than looking like a bright disconnected stock photo.
This is a GENERIC stand-in, not a photo of a specific real event — avoid
anything that reads as a specific date, banner, or identifiable location
detail, since it should be usable as general-purpose gallery content
rather than mislabeled as documentation of one exact meeting.
Avoid: text, logos, faces looking directly/posed at camera, stock-photo
forced smiles.
4:5 portrait, natural documentary photo style, do not crop.
```

```
FILE: working/gallery-standin-2.jpg
RATIO: 4:5 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
4:5 portrait, do not output square or landscape, do not crop.
A natural, photo-real documentary-style photograph: students
collaborating around a laptop or whiteboard, working through a problem
together — a workshop or study-session feel rather than a formal
meeting. Warm ambient indoor lighting, candid rather than posed.
Color grading: pull the overall image about 10% toward neutral/
desaturated (saturate ~0.9) and slightly cool the shadows, so it will
sit naturally against a dark solar-blue palette once placed in the UI.
This is a GENERIC stand-in, not a photo of a specific real event — avoid
anything reading as a specific date or identifiable location detail.
Avoid: text, logos, faces looking directly/posed at camera, stock-photo
forced smiles.
4:5 portrait, natural documentary photo style, do not crop.
```

```
FILE: working/gallery-standin-3.jpg
RATIO: 4:5 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
4:5 portrait, do not output square or landscape, do not crop.
A natural, photo-real documentary-style photograph: a student volunteer
handing out or scanning something at a small table/booth setup —
suggesting a QR check-in / event-volunteer moment, without depicting an
actual phone screen or QR code in detail. Warm ambient indoor lighting,
candid rather than posed.
Color grading: pull the overall image about 10% toward neutral/
desaturated (saturate ~0.9) and slightly cool the shadows, so it will
sit naturally against a dark solar-blue palette once placed in the UI.
This is a GENERIC stand-in, not a photo of a specific real event — avoid
anything reading as a specific date or identifiable location detail.
Avoid: text, logos, faces looking directly/posed at camera, stock-photo
forced smiles.
4:5 portrait, natural documentary photo style, do not crop.
```

```
FILE: working/gallery-standin-4.jpg
RATIO: 4:5 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
4:5 portrait, do not output square or landscape, do not crop.
A natural, photo-real documentary-style photograph: a wider shot of a
small group listening to a presenter or guest speaker in a casual
seminar-room setting — a few rows of seated students, presenter visible
but not the focal point of the whole frame. Warm ambient indoor
lighting, candid rather than posed.
Color grading: pull the overall image about 10% toward neutral/
desaturated (saturate ~0.9) and slightly cool the shadows, so it will
sit naturally against a dark solar-blue palette once placed in the UI.
This is a GENERIC stand-in, not a photo of a specific real event — avoid
anything reading as a specific date or identifiable location detail.
Avoid: text, logos, faces looking directly/posed at camera, stock-photo
forced smiles.
4:5 portrait, natural documentary photo style, do not crop.
```

```
FILE: working/gallery-standin-5.jpg
RATIO: 4:5 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
4:5 portrait, do not output square or landscape, do not crop.
A natural, photo-real documentary-style photograph: a relaxed outdoor or
hallway candid moment — a couple of students chatting near a campus
window or outdoor bench, casual and unposed, suggesting the social/
community side of the club rather than a formal activity.
Color grading: pull the overall image about 10% toward neutral/
desaturated (saturate ~0.9) and slightly cool the shadows, so it will
sit naturally against a dark solar-blue palette once placed in the UI.
This is a GENERIC stand-in, not a photo of a specific real event — avoid
anything reading as a specific date or identifiable location detail.
Avoid: text, logos, faces looking directly/posed at camera, stock-photo
forced smiles.
4:5 portrait, natural documentary photo style, do not crop.
```

---

## Group 7 — Beyond the app

**Generate exactly 2 separate images in one batch. Each image must be a standalone file, not a collage or multi-panel composition. Keep the same brand mark and palette across both, but make the composition, aspect ratio, and purpose clearly distinct (a printable poster versus a social-share background).**

```
FILE: working/recruitment-poster.jpg
RATIO: 2:3 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
2:3 portrait, do not output square or landscape, do not crop.
A printable recruitment poster/flyer illustration for the Jules energy
club — the central image only (real event details, dates, and a QR code
get composited in afterward, so leave clear open space in the lower
third of the frame for that). Subject: a bold, confident rendering of
the atom-spark brand mark (two crossed orbit rings, a central bolt, one
kumkum #E34234 accent point) rendered large and dynamic, with a subtle
circuit-vine motif (organic vines resolving into circuit traces) woven
around it at lower opacity.
Palette: gold #FFC72C and kumkum #E34234 as the two focal colors against
a deep #070b12 background, high contrast and poster-legible from a
distance (this will be printed and pinned to a hallway board).
Avoid: any text (added afterward in code/design software), small fine
detail that would disappear at print/poster viewing distance.
2:3 portrait, bold central mark with a circuit-vine motif, open space
reserved in the lower third, do not crop.
```

```
FILE: working/og-image-background.jpg
RATIO: 1.91:1 (1200x630) — do not output square or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1.91:1 landscape at 1200x630, do not output square or portrait, do not
crop. A social-share background image (text/title renders in code on
top of this via Next.js's dynamic OG image generation, so this image
must NOT contain any text at all). Subject: the atom-spark brand mark
positioned in the right third of the frame, medium-large scale, with a
particle-network motif (small gold #FFC72C nodes connected by thin
lines) filling the rest of the frame at lower density, on a flat #070b12
to #0d1620 gradient background.
Leave the LEFT two-thirds of the frame relatively clear/dark, since the
page title and site name render there in code — the mark and particle
field should feel like a supporting visual, not compete with text that
isn't in this image yet.
Avoid: any text, logos other than the Jules mark, busy detail in the
left two-thirds.
1.91:1 (1200x630), mark in the right third, clear dark space on the
left two-thirds, do not crop.
```

---

## Group 8 — Brand system

*Folder: `public/icons/brand/`. These target the EXISTING, already-established atom-spark mark (two thin gold orbit rings crossed at roughly ±24-28°, a gold lightning-bolt shape at the center, one small kumkum accent dot where the rings intersect) — every prompt below instructs the generator to faithfully reproduce that exact construction, never invent a new symbol.*

### 8.0 — Bonus: full brand-kit presentation board

*Not in the original manifest — added using a dedicated brand-identity generation technique from the project's own skill library. Useful as a coherent, presentation-ready reference for the whole system in one image, on top of the individual files below. This one IS intentionally a single multi-panel board — generate it alone, not as part of a same-batch set.*

```
FILE: working/brand-kit-board.png
RATIO: 16:10 landscape — do not output square or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
16:10 landscape, do not output square or portrait, do not crop.
Create a premium brand-kit overview image for "Jules" — a college
energy-management club's gamified engagement app.

Brand strategy:
- category: campus energy/sustainability club engagement platform,
  gamified participation tracking (quizzes, event check-ins, tiers)
- audience: college students, energy-club members
- personality: optimistic, energetic, warm but technically confident,
  community-driven — never dystopian, never cold-corporate
- core metaphor: "every atom generates a spark" — Joules as an energy
  currency, an atom-orbit as the literal brand symbol
- logo: DO NOT invent a new mark. Faithfully reproduce the existing
  logo exactly as described: two thin gold #FFC72C ellipse/orbit rings
  crossed at roughly plus and minus 24-28 degrees, a simple gold
  lightning-bolt shape at the center, and one small kumkum #E34234
  accent dot positioned exactly where the two rings intersect. Repeat
  this exact mark consistently across every panel that shows it.

Layout: 3x3 grid on a near-black #070b12 presentation canvas, strong
even gutters, clean alignment, refined negative space, small page-number
labels in each panel's corner.

Panels:
1. Logo cover — the mark large and centered with the "Jules" wordmark
   beneath it, extremely minimal, generous negative space.
2. Logo construction — the mark broken down with thin construction
   guidelines showing the ring angles and the dot's exact placement at
   the intersection, demonstrating why the mark is built this way.
3. Digital application — the mark inside a simple dark mobile-app
   header/status-bar frame, small and correctly scaled.
4. Brand essence — one short tagline in large sparse type: "Every atom
   generates a spark."
5. Color system — swatch chips for void #070b12, card #0d1620, kumkum
   #E34234, gold #FFC72C, success/verdant #3ba26b, plus the two newer
   companions amber-dust #C98A3E and deep verdant-teal #2E8B7A.
6. Typography — a large specimen showing a confident geometric display
   face paired with a warmer humanist body face, sentence case, no
   fake body-copy paragraphs.
7. Physical application — the mark on a simple event badge or lanyard
   card mockup, minimal, no busy printed detail.
8. Image direction — a small cinematic panel of an ambient
   particle-and-orbit-ring motif, softly glowing gold nodes connected by
   thin lines on void.
9. System detail — a thin row of four cosmetic-item slot icon
   silhouettes (hat, outfit, accessory, effect) as simple line marks.

Visual mode: a custom "solarpunk energy-tech" mode — combine dark,
confident, precise developer-tool restraint with warm organic
undertones (thin vine-like line work threaded subtly through the grid
lines), gold as the dominant accent, kumkum used sparingly for single
emphasis points only, never both used loudly in the same panel.

Style: premium, sparse, cinematic, intentional, polished, brand-
guidelines deck, no clutter, no generic AI gradient glow, no invented
logo variants that depart from the exact mark described above.

Typography: readable, minimal, high hierarchy, no tiny fake body text.

16:10 landscape, 3x3 grid, do not crop.
```

### 8.1–8.8 — Individual production files

**Generate exactly 8 separate images in one batch. Each image must be a standalone file, not a collage or multi-panel composition. Every image reproduces the same exact existing mark construction — only the lockup, color treatment, or framing differs between them.**

```
FILE: public/icons/brand/wordmark-horizontal.png
RATIO: 3:1 wide — do not output square or tall, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
3:1 wide, do not output square or tall, do not crop.
The EXISTING Jules mark (two thin gold #FFC72C orbit rings crossed at
roughly plus and minus 24-28 degrees, a gold lightning-bolt shape at the
center, one small kumkum #E34234 dot exactly at the ring intersection —
do not redesign or reinterpret this construction) positioned to the
left, followed by the wordmark "Jules" set in a clean, confident
geometric sans typeface, foreground #eef4fb, vertically centered against
the mark's height.
Background: flat #070b12, generous horizontal breathing room on both
sides (this lockup needs to work in a thin header bar).
Style: flat, crisp, high-contrast — no gradients, no drop shadow, no
photographic texture, reads clearly even scaled down to a 24px-tall
header logo.
Avoid: any change to the mark's ring angles, bolt shape, or dot
placement.
3:1 wide, flat #070b12 background, do not crop.
```

```
FILE: public/icons/brand/wordmark-stacked.png
RATIO: 3:4 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
3:4 portrait, do not output square or landscape, do not crop.
The EXISTING Jules mark (two thin gold #FFC72C orbit rings crossed at
roughly plus and minus 24-28 degrees, a gold lightning-bolt shape at the
center, one small kumkum #E34234 dot exactly at the ring intersection —
do not redesign or reinterpret this construction) placed ABOVE the
"Jules" wordmark, centered, with modest vertical spacing between mark
and type — for use in square-ish or portrait spaces where a horizontal
lockup doesn't fit (app icon supplementary art, printed materials).
Background: flat #070b12.
Style: flat, crisp, high-contrast — no gradients, no drop shadow, no
photographic texture.
Avoid: any change to the mark's ring angles, bolt shape, or dot
placement.
3:4 portrait, flat #070b12 background, do not crop.
```

```
FILE: public/icons/brand/mark-mono.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
The EXISTING Jules mark ONLY (no wordmark) — the same two crossed orbit
rings and central bolt, unchanged construction — but rendered in a
SINGLE flat color throughout (foreground #eef4fb, no gold, no kumkum;
the intersection dot becomes the same single color as the rest, not a
separate accent) for use at extremely small sizes (browser favicon)
where color separation would be lost anyway.
Background: flat #070b12.
Style: maximum clarity at tiny scale — bold, simple, high-contrast, no
fine detail that would disappear below 16px.
Avoid: any change to the ring angles or bolt shape versus the color
version; this must read as unmistakably the same mark, just monochrome.
1:1 square, flat #070b12 background, single-color mark, do not crop.
```

```
FILE: public/icons/brand/seal.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
The EXISTING Jules mark (unchanged construction — gold crossed orbit
rings, central bolt, kumkum intersection dot) placed at the center of a
circular seal/emblem frame — a thin double-ring border in gold #FFC72C
with small evenly-spaced tick marks around its inner edge, no text
inside the seal (the seal is used standalone, e.g. on a certificate or
official-feeling badge, without a curved text ring).
Background: flat #070b12.
Style: crisp, formal, slightly more ornate than the plain mark but still
restrained — this is for a small number of "official/commemorative"
moments (certificates, season banners), not everyday UI use.
Avoid: any change to the central mark's construction; ornate flourishes
beyond the simple double-ring border and tick marks.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/brand/mark-ember.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
The EXISTING Jules mark (unchanged construction — two crossed orbit
rings, central bolt, one accent dot at the intersection) but fully
recolored to the EMBER tier tone: rings and bolt in #d99a4e (warm
amber-orange) instead of gold, the accent dot in a slightly deeper warm
tone rather than kumkum. This is a tier-badge variant of the primary
mark, used specifically in Ember-tier contexts.
Background: flat #1c140a (the existing ember-tier background tone).
Style: flat, crisp, no gradients, identical ring angles/bolt shape/scale
to the primary gold mark — only the color changes.
1:1 square, flat #1c140a background, do not crop.
```

```
FILE: public/icons/brand/mark-volt.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
The EXISTING Jules mark (unchanged construction — two crossed orbit
rings, central bolt, one accent dot at the intersection). This is the
VOLT tier variant: rings and bolt in gold #FFC72C, brighter and more
electric than the ember version, accent dot in a slightly warmer
gold-orange rather than kumkum.
Background: flat #1c1608 (the existing volt-tier background tone).
Style: flat, crisp, no gradients, identical ring angles/bolt shape/scale
to the primary mark — only the color changes.
1:1 square, flat #1c1608 background, do not crop.
```

```
FILE: public/icons/brand/mark-current.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
The EXISTING Jules mark (unchanged construction — two crossed orbit
rings, central bolt, one accent dot at the intersection). This is the
CURRENT tier variant: rings and bolt in gold #FFC72C, but the accent dot
AND a thin outer glow around the whole mark both use kumkum #E34234 —
the first tier where kumkum reappears, marking it as more advanced than
Volt.
Background: flat #1a1210 (the existing current-tier background tone).
Style: flat, crisp, identical ring angles/bolt shape/scale to the
primary mark — only the color and the added glow change.
1:1 square, flat #1a1210 background, do not crop.
```

```
FILE: public/icons/brand/mark-plasma.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
The EXISTING Jules mark (unchanged construction — two crossed orbit
rings, central bolt, one accent dot at the intersection). This is the
PLASMA tier variant, the highest tier: rings and bolt in the brightest
gold #FFC72C with a visible soft outer glow/bloom (more intense than
Current's), accent dot in kumkum #E34234. This should read as clearly
the most striking of the four tier marks when compared side by side.
Background: flat #241a05 (the existing plasma-tier background tone).
Style: flat, crisp, identical ring angles/bolt shape/scale to the
primary mark — only the color and glow intensity change.
1:1 square, flat #241a05 background, do not crop.
```

---

## Group 9 — Icon system

*Folder: `public/icons/ui/`. Shared house style for every icon in this group: a single small navigation/utility icon, flat and simple enough to read clearly at 24x24px, one consistent thin stroke weight throughout with rounded caps and joins (matching the brand mark's line language), stroke color gold #FFC72C unless noted otherwise, rendered on a flat #070b12 background (true alpha transparency isn't reliable from these tools, so the flat dark background is the intended final context, not a placeholder to remove). No gradients, no drop shadows, no photographic texture, no text.*

### 9.1–9.9 — Admin nav icon set

**Generate exactly 9 separate images in one batch. Each image must be a standalone file, not a collage or multi-panel composition. All 9 share identical stroke weight, corner rounding, scale, and background so they read as one family — only the subject shape differs between them.**

```
FILE: public/icons/ui/admin-dashboard.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI navigation icon — single thin gold #FFC72C
stroke, rounded caps and joins, reads clearly at 24x24px, flat #070b12
background, no gradients/shadows/text.
Subject: a simple overview shape — four small rounded squares arranged
in a 2x2 grid, representing "dashboard/overview." This is icon 1 of 9 in
the admin navigation set; every icon in the set shares this exact stroke
weight and corner rounding.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/admin-grid.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI navigation icon — single thin gold #FFC72C
stroke, rounded caps and joins, reads clearly at 24x24px, flat #070b12
background, no gradients/shadows/text.
Subject: a simple square-grid/QR-module shape with one short diagonal
scan-line crossing it, representing the "Grid Station" QR check-in
screen. This is icon 2 of 9 in the admin navigation set, sharing the
same stroke weight and rounding as the rest of the set.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/admin-surge.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI navigation icon — single thin gold #FFC72C
stroke, rounded caps and joins, reads clearly at 24x24px, flat #070b12
background, no gradients/shadows/text.
Subject: a simple lightning-bolt shape with one small plus/edit mark at
its tip, representing "Surge Builder" (quiz question authoring). This is
icon 3 of 9 in the admin navigation set, sharing the same stroke weight
and rounding as the rest of the set.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/admin-ledger.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI navigation icon — single thin gold #FFC72C
stroke, rounded caps and joins, reads clearly at 24x24px, flat #070b12
background, no gradients/shadows/text.
Subject: a simple rectangle containing three short horizontal lines of
decreasing width, representing "System Ledger" (an activity/engagement
log). This is icon 4 of 9 in the admin navigation set, sharing the same
stroke weight and rounding as the rest of the set.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/admin-vault.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI navigation icon — single thin gold #FFC72C
stroke, rounded caps and joins, reads clearly at 24x24px, flat #070b12
background, no gradients/shadows/text.
Subject: a simple padlock shape (rounded body, simple shackle arc),
representing "Student Data Vault." This is icon 5 of 9 in the admin
navigation set, sharing the same stroke weight and rounding as the rest
of the set.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/admin-settings.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI navigation icon — single thin gold #FFC72C
stroke, rounded caps and joins, reads clearly at 24x24px, flat #070b12
background, no gradients/shadows/text.
Subject: a simple gear shape with six evenly-spaced teeth and a small
circular center hole, representing "Institution Settings." This is icon
6 of 9 in the admin navigation set, sharing the same stroke weight and
rounding as the rest of the set.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/admin-live.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI navigation icon — single thin gold #FFC72C
stroke, rounded caps and joins, reads clearly at 24x24px, flat #070b12
background, no gradients/shadows/text.
Subject: a simple broadcast shape — a small filled dot with two nested
open arcs radiating outward on one side, representing "Live Round"
(host-paced quiz mode). This is icon 7 of 9 in the admin navigation set,
sharing the same stroke weight and rounding as the rest of the set.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/admin-afterglow.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI navigation icon — single thin gold #FFC72C
stroke, rounded caps and joins, reads clearly at 24x24px, flat #070b12
background, no gradients/shadows/text.
Subject: a simple open-book shape (two facing pages, slight center fold
line), representing "Afterglow" (written event recaps). This is icon 8
of 9 in the admin navigation set, sharing the same stroke weight and
rounding as the rest of the set.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/admin-gallery.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI navigation icon — single thin gold #FFC72C
stroke, rounded caps and joins, reads clearly at 24x24px, flat #070b12
background, no gradients/shadows/text.
Subject: two slightly overlapping rounded-rectangle "photo" shapes, the
back one offset up and right from the front one, representing "Gallery."
This is icon 9 of 9 in the admin navigation set, sharing the same stroke
weight and rounding as the rest of the set.
1:1 square, flat #070b12 background, do not crop.
```

### 9.10–9.16 — Node nav / utility icon set

**Generate exactly 7 separate images in one batch. Each image must be a standalone file, not a collage or multi-panel composition. All 7 share identical stroke weight, corner rounding, scale, and background so they read as one family — only the subject shape differs between them.**

```
FILE: public/icons/ui/node-dashboard.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI navigation icon — single thin gold #FFC72C
stroke, rounded caps and joins, reads clearly at 24x24px, flat #070b12
background, no gradients/shadows/text.
Subject: a simple rounded-house/overview shape, representing the student
dashboard. This is icon 1 of 7 in the Node (student) navigation set;
every icon in the set shares this exact stroke weight and rounding.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/node-scan.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI navigation icon — single thin gold #FFC72C
stroke, rounded caps and joins, reads clearly at 24x24px, flat #070b12
background, no gradients/shadows/text.
Subject: a simple square-bracket viewfinder shape (four small corner
brackets forming an implied square), representing QR check-in scanning.
This is icon 2 of 7 in the Node navigation set, sharing the same stroke
weight and rounding as the rest of the set.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/node-surge.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI navigation icon — single thin gold #FFC72C
stroke, rounded caps and joins, reads clearly at 24x24px, flat #070b12
background, no gradients/shadows/text.
Subject: a simple lightning-bolt shape (no plus mark — that variant
belongs to the admin Surge Builder icon), representing Surge Mode
quizzes. This is icon 3 of 7 in the Node navigation set, sharing the
same stroke weight and rounding as the rest of the set.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/node-catalyst.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI navigation icon — single thin gold #FFC72C
stroke, rounded caps and joins, reads clearly at 24x24px, flat #070b12
background, no gradients/shadows/text.
Subject: a simple layered-medallion shape (two or three thin concentric
circles, faint star-point suggestion at the center), representing
"Catalyst Records" (the season archive). This is icon 4 of 7 in the Node
navigation set, sharing the same stroke weight and rounding as the rest
of the set.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/node-profile.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI navigation icon — single thin gold #FFC72C
stroke, rounded caps and joins, reads clearly at 24x24px, flat #070b12
background, no gradients/shadows/text.
Subject: a simple person silhouette (rounded head circle above a
rounded shoulder arc), representing the student profile. This is icon 5
of 7 in the Node navigation set, sharing the same stroke weight and
rounding as the rest of the set.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/node-streak.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI navigation icon — single thin gold #FFC72C
stroke, rounded caps and joins, reads clearly at 24x24px, flat #070b12
background, no gradients/shadows/text.
Subject: a simple single flame silhouette, small and understated (this
is the compact nav icon version, not the illustrated flame-stage FX set)
representing the daily streak count. This is icon 6 of 7 in the Node
navigation set, sharing the same stroke weight and rounding as the rest
of the set.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/node-bell.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI navigation icon — single thin gold #FFC72C
stroke, rounded caps and joins, reads clearly at 24x24px, flat #070b12
background, no gradients/shadows/text.
Subject: a simple bell silhouette (rounded bell body, small base line,
no clapper detail), representing notifications. This is icon 7 of 7 in
the Node navigation set, sharing the same stroke weight and rounding as
the rest of the set.
1:1 square, flat #070b12 background, do not crop.
```

### 9.17–9.20 — Cosmetic slot icons

**Generate exactly 4 separate images in one batch. Each image must be a standalone file, not a collage or multi-panel composition. All 4 share identical stroke weight, scale, and background — only the subject shape differs, one per avatar cosmetic slot.**

```
FILE: public/icons/ui/slot-hat.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI icon for the avatar collection tree — single thin
gold #FFC72C stroke, rounded caps and joins, flat #070b12 background, no
gradients/shadows/text.
Subject: a simple wide-brimmed hat silhouette with a small horn/curve
detail on each side (echoing the "hat" slot's items like Ember Circlet,
Plasma Crown). This is icon 1 of 4 cosmetic-slot icons; all four share
identical stroke weight and scale.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/slot-outfit.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI icon for the avatar collection tree — single thin
gold #FFC72C stroke, rounded caps and joins, flat #070b12 background, no
gradients/shadows/text.
Subject: a simple tunic/cloak silhouette (rounded shoulders tapering to
a wider hem), representing the "outfit" slot (Sprout Wrap, Current
Cloak). This is icon 2 of 4 cosmetic-slot icons, sharing identical
stroke weight and scale with the rest.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/slot-accessory.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI icon for the avatar collection tree — single thin
gold #FFC72C stroke, rounded caps and joins, flat #070b12 background, no
gradients/shadows/text.
Subject: a simple pendant-on-a-cord silhouette (small circle hanging
from a thin looped line), representing the "accessory" slot (Volt
Charm, Atom Orbit Ring). This is icon 3 of 4 cosmetic-slot icons,
sharing identical stroke weight and scale with the rest.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/slot-effect.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI icon for the avatar collection tree — single thin
gold #FFC72C stroke, rounded caps and joins, flat #070b12 background, no
gradients/shadows/text.
Subject: a simple radiating-burst shape (a small center dot with 5-6
short lines radiating outward), representing the "effect" slot (Spark
Aura). This is icon 4 of 4 cosmetic-slot icons, sharing identical stroke
weight and scale with the rest.
1:1 square, flat #070b12 background, do not crop.
```

### 9.21–9.24 — Slot badge shapes (category shape-coding)

**Generate exactly 4 separate images in one batch. Each image must be a standalone file, not a collage or multi-panel composition. All 4 share identical stroke weight and background — only the outline shape differs, one per cosmetic category, so category is recognizable by shape alone.**

```
FILE: public/icons/ui/badge-hat.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI badge-shape icon — thin gold #FFC72C outline
only (no fill), flat #070b12 background, no gradients/shadows/text.
Subject: a simple CIRCLE outline, the badge shape reserved for "hat"
slot items. This is icon 1 of 4 slot badge shapes, each a distinct
container silhouette per category so category is recognizable by shape
alone, not color alone.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/badge-outfit.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI badge-shape icon — thin gold #FFC72C outline
only (no fill), flat #070b12 background, no gradients/shadows/text.
Subject: a simple SHIELD-shaped outline (flat top, tapering to a rounded
point at the bottom), the badge shape reserved for "outfit" slot items.
This is icon 2 of 4 slot badge shapes, sharing the same stroke weight
and background as the rest.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/badge-accessory.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI badge-shape icon — thin gold #FFC72C outline
only (no fill), flat #070b12 background, no gradients/shadows/text.
Subject: a simple DIAMOND (rotated square) outline, the badge shape
reserved for "accessory" slot items — matches the diamond control
language used elsewhere in the avatar module. This is icon 3 of 4 slot
badge shapes, sharing the same stroke weight and background as the rest.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/badge-effect.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single small flat UI badge-shape icon — thin gold #FFC72C outline
only (no fill), flat #070b12 background, no gradients/shadows/text.
Subject: a simple 6-POINT STARBURST outline, the badge shape reserved
for "effect" slot items — the most visually active of the four badge
shapes, matching that slot's more energetic content. This is icon 4 of 4
slot badge shapes, sharing the same stroke weight and background as the
rest.
1:1 square, flat #070b12 background, do not crop.
```

---

## Group 10 — Diamond avatar-control icons

*Folder: `public/icons/ui/`. Shared house style: a diamond (45-degree-rotated square) housing shape with a thin gold #FFC72C outline, containing a simple centered symbol in the same stroke weight, flat #070b12 background, matching the control language from the reference character-card UI.*

**Generate exactly 5 separate images in one batch. Each image must be a standalone file, not a collage or multi-panel composition. All 5 share an identical diamond housing shape, stroke weight, and scale — only the symbol inside differs.**

```
FILE: public/icons/ui/avatar-control-profile.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A diamond (45-degree rotated square) outline in thin gold #FFC72C, flat
#070b12 background, no gradients/shadows/text. Inside the diamond: a
simple small person-silhouette symbol, representing "view profile."
This is icon 1 of 5 diamond avatar-control icons; every icon in this set
shares an identical diamond size, stroke weight, and symbol scale.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/avatar-control-inventory.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A diamond (45-degree rotated square) outline in thin gold #FFC72C, flat
#070b12 background, no gradients/shadows/text. Inside the diamond: a
simple small backpack/bag symbol, representing "collection/inventory."
This is icon 2 of 5 diamond avatar-control icons, sharing the same
diamond size, stroke weight, and symbol scale as the rest.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/avatar-control-leaderboard.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A diamond (45-degree rotated square) outline in thin gold #FFC72C, flat
#070b12 background, no gradients/shadows/text. Inside the diamond: a
simple small crown symbol, representing "leaderboard/ranking." This is
icon 3 of 5 diamond avatar-control icons, sharing the same diamond size,
stroke weight, and symbol scale as the rest.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/avatar-control-streak.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A diamond (45-degree rotated square) outline in thin gold #FFC72C, flat
#070b12 background, no gradients/shadows/text. Inside the diamond: a
simple small flame symbol, representing "streak." This is icon 4 of 5
diamond avatar-control icons, sharing the same diamond size, stroke
weight, and symbol scale as the rest.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/icons/ui/avatar-control-customize.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A diamond (45-degree rotated square) outline in thin gold #FFC72C, flat
#070b12 background, no gradients/shadows/text. Inside the diamond: a
simple small sparkle/wand symbol, representing "customize." This is icon
5 of 5 diamond avatar-control icons, sharing the same diamond size,
stroke weight, and symbol scale as the rest.
1:1 square, flat #070b12 background, do not crop.
```

---

## Group 11 — QR frame

```
FILE: public/icons/ui/qr-frame.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A decorative corner-bracket frame ONLY — four simple L-shaped brackets,
one per corner, in thin gold #FFC72C stroke, with generous empty space
in the middle of the frame (a real QR module grid gets composited into
that empty center in code afterward — this image must NOT contain any
QR-code-like grid pattern itself, since the real scannable code must
stay untouched plain black-on-white for scan reliability).
Background: fully flat #070b12 outside the bracket shapes.
Style: thin, elegant, matching the brand mark's line weight — this is
purely ornamental framing, not a functional code.
Avoid: any grid/module pattern, any text, any color other than gold on
the brackets.
1:1 square, flat #070b12 background, open center, do not crop.
```

---

## Group 12 — Celebration icons

*Folder: `public/images/fx/`*

**Generate exactly 4 separate images in one batch. Each image must be a standalone file, not a collage or multi-panel composition. Keep the same tiny, bold, flat-fill treatment across all 4, but make each shape and color clearly distinct.**

```
FILE: public/images/fx/confetti-atom.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single TINY confetti particle shape (this renders at only a few
pixels across in the real celebration animation, so keep the shape
extremely simple and bold) — a miniature version of the brand's
crossed-orbit-ring motif, flat gold #FFC72C fill, no outline, no
gradient, on a flat #070b12 background. This is 1 of 3 custom confetti
shapes for winner-burst celebrations.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/images/fx/confetti-spark.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single TINY confetti particle shape (renders at only a few pixels
across, so keep it extremely simple and bold) — a small simple
lightning-bolt silhouette, flat gold #FFC72C fill, no outline, no
gradient, on a flat #070b12 background. This is 2 of 3 custom confetti
shapes for winner-burst celebrations.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/images/fx/confetti-leaf.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A single TINY confetti particle shape (renders at only a few pixels
across, so keep it extremely simple and bold) — a small simple leaf
silhouette, flat success-green #3ba26b fill, no outline, no gradient, on
a flat #070b12 background — the one confetti piece that carries the
"organic" half of the solarpunk motif rather than the "energy" half the
other two carry. This is 3 of 3 custom confetti shapes.
1:1 square, flat #070b12 background, do not crop.
```

```
FILE: public/images/fx/joule-burst.png
RATIO: 1:1 square — do not output landscape or portrait, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
1:1 square, do not output landscape or portrait, do not crop.
A small radiating-burst icon for the "Joule gained" moment — a bright
gold #FFC72C filled center dot with 8 short, evenly-spaced lines
radiating outward, slightly thicker near the center and tapering toward
their tips, flat #070b12 background. Bold and simple enough to read
instantly at small size during a fast-moving quiz UI moment.
Avoid: text, numbers, gradients, photographic texture.
1:1 square, flat #070b12 background, do not crop.
```

---

## Group 13 — Afterglow video + season recap (scope still open, generating anyway)

*Both of these still need a follow-up decision before they're wired into the app — Afterglow needs a `video_url` column + storage bucket, and the season-recap card is a new feature, not just an asset. Generating them now is fine; wiring them in is a separate step. Each of the two below is generated independently, not as part of a matched batch.*

```
FILE: working/afterglow-recap-standin.mp4
RATIO: 16:9 landscape, ~15-20 seconds — do not output square or portrait
PROMPT:
Generate this video from scratch. Do not use, edit, or reference any
other image or video — this is a standalone generation instruction.
16:9 landscape, roughly 15-20 seconds, do not output square or portrait.
A short, natural, photo-real (not illustrated) documentary-style video
clip of a generic college club moment — students seated in a casual
meeting or workshop setting, warm ambient indoor lighting, gentle
natural movement (talking, gesturing, someone writing on a whiteboard),
no dramatic camera moves, no music sting required (this plays muted with
captions in the real UI). Color grading: pulled slightly toward neutral/
desaturated to sit naturally against a dark site palette once embedded.
This is a GENERIC stand-in, not footage of one specific real event —
avoid anything reading as a specific date or identifiable detail tying
it to one exact meeting.
Avoid: text overlays, logos, on-screen graphics, upbeat commercial-style
b-roll music energy (the mood should be calm and real, not promotional).
16:9 landscape, ~15-20 seconds, natural documentary style.
```

```
FILE: working/season-recap-card-background.png
RATIO: 4:5 portrait — do not output square or landscape, do not crop
PROMPT:
Generate this image from scratch. Do not use, edit, or reference any
other image — this is a standalone generation instruction.
4:5 portrait, do not output square or landscape, do not crop.
A background template for a shareable "season recap" card (the actual
stats/numbers/name render in code on top of this, so leave the image
itself free of any text or numerals). Subject: an ambient
particle-network motif (small gold #FFC72C nodes connected by thin
lines) arranged densely toward the bottom third of the frame and fading
upward into open flat #070b12 space at the top, where a student's name
and season stats would be composited afterward.
Mood: celebratory but calm — a personal end-of-season keepsake image,
not a loud group-celebration burst.
Avoid: any text, numerals, human figures, busy detail in the top half
of the frame where text needs to sit clearly.
4:5 portrait, dense particle field at the bottom fading to open space at
the top, do not crop.
```
