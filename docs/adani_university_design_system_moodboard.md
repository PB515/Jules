# Adani University — Synergy Platform Master Design System & Moodboard Book

## 📖 Executive Summary & 5W Architectural Blueprint

| Dimensional Axis | Strategic Specification |
|---|---|
| **WHO (Target Audience & Stakeholders)** | **Adani University Faculty of Management Sciences (FMS)** MBA Students (ages 21–28), Faculty Professors, and Student Committee Members. The persona demands an **authoritative, prestigious, institutional MBA aesthetic**—professional first, delight through craft, zero childish gimmicks. |
| **WHAT (The Product & Ecosystem)** | **Synergy Execution Platform**: A mobile-first Student PWA (`app/(node)/*`), Admin/Staff Command Center PWA (`app/admin/*`), and Public Marketing Portal (`app/(general)/*`). Incorporates gamified live classroom quizzes ("Kahoot" 2x2 grid), QR event check-ins, standing tier progression (Ember $\rightarrow$ Volt $\rightarrow$ Current $\rightarrow$ Plasma), and institutional Catalyst Records. |
| **WHEN (Usage Contexts & Cadence)** | Live during 60–90 minute MBA lectures, mid-event QR check-ins, daily async quiz rounds ("Surges"), and post-event committee report submissions. |
| **WHERE (Viewport & Hardware Enclosure)** | **Student PWA**: Phone-width `max-w-md` centered viewport (Android Chrome / iOS Safari standalone PWA). **Admin PWA**: Desktop sidebar + mobile header responsive command center. **Projector View**: High-contrast classroom presentation display. |
| **WHY (Core Objective & Product Philosophy)** | To transform passive attendance into active, measurable institutional participation, fostering healthy academic competition, peer recognition, and verifiable merit tracking through a refined, light-themed university experience. |

---

## 🎨 1. Color Palette & Optical Hierarchy

### Core Brand Tokens
```
+-----------------------------------------------------------------------+
|  ADANI TEAL (#008CA8)  |  ROYAL BLUE (#2D4C9C)  |  VIOLET (#633A8C)    |
|  Option A / Live Pills |  Option B / CTAs       |  Option C / Multiplier|
+-----------------------------------------------------------------------+
|  ADANI CRIMSON (#CE235B) / MAROON (#BD3861)    |  WARM CANVAS (#FDFBF9)|
|  Option D / Points / Primary Brand Identity   |  Off-white Canvas     |
+-----------------------------------------------------------------------+
```

1. **Adani Crimson / X11 Maroon (`#BD3861` / `#CE235B`)**:
   - Primary brand anchor, primary action CTAs, season point counters, key headlines, and active navigation indicators.
2. **Adani Royal Blue (`#2D4C9C`)**:
   - Secondary actions, session PIN displays, Kahoot Option B (Diamond ◆).
3. **Adani Teal (`#008CA8`)**:
   - Live status badges, scanner highlights, Kahoot Option A (Triangle ▲).
4. **Adani Violet (`#633A8C`)**:
   - Multipliers, milestone suspense banners, Kahoot Option C (Circle ●).
5. **Adani Spectrum Gradient**:
   - `linear-gradient(135deg, #008CA8 0%, #2D4C9C 35%, #633A8C 70%, #CE235B 100%)`
   - Reserved for Rank #1 Leaderboard pills, Plasma Tier badges, daily splash hero elements, and primary logo accents.

---

## 📐 2. Typography System (Option A Specs)

* **Primary Display & Headings**: `Plus Jakarta Sans` (Google Font)
  * *Weights*: Bold (700), ExtraBold (800), Black (900)
  * *Letter Spacing*: Tight (`-0.02em`) for headlines, tracked (`0.05em` uppercase) for section eyebrows.
* **Primary Body & UI Text**: `Inter` (Google Font)
  * *Weights*: Regular (400), Medium (500), SemiBold (600)
  * *Line Height*: 1.5 for optimal mobile scannability.
* **Monospace / Data Display**: `JetBrains Mono` / System Monospace
  * Used for room PIN codes (`849-204`), 10-char check-in strings, timestamps, and point metrics.

---

## 💎 3. 2D Flat Vector Asset Protocol

All generated icons, tier badges, and graphics must adhere strictly to these 2D vector rules for 100% visual consistency:

### A. Style & Perspective
- **Medium**: Clean 2D flat vector iconography, minimalist corporate UI design, flat color fills, zero 3D glossy reflections, zero bevel shadows.
- **Camera View**: 100% flat 0-degree straight-on front view (no 3D tilts, angled perspectives, or focal distortion).

### B. Container & Frame Standardization
- **Frame**: Every tier badge icon is encased inside an identical smooth 2D circular silver border ring.
- **Symbol**: Centered minimal vector emblem (Ember Flame, Volt Lightning, Current Shield, Plasma Starburst).

### C. Cutout & Canvas Rule
- **Background**: `isolated on a seamless pure solid white background (#FFFFFF)`
- **Cutout**: Razor-sharp vector edges without shadows, color bleeding, or canvas cast shadows.

---

## ⚡ 4. Gamified UI & Interaction Rules

1. **Tactile Neumorphism-Lite Buttons**:
   - Primary CTAs utilize Style 2 Adani Logo Gradient: `bg-adani-gradient text-white font-heading font-extrabold shadow-[0_4px_16px_rgba(0,140,168,0.3)] hover:scale-[1.01] active:scale-[0.98] transition-all`.
2. **The Kahoot 2x2 Answer Grid**:
   - 4 full-width/grid cards paired 1-to-1 with Adani colors and distinct geometric icons (▲ Teal, ◆ Blue, ● Violet, ■ Crimson).
3. **Decaying Energy Bar**:
   - Smooth decay over question time limit, recoloring Green $\rightarrow$ Amber $\rightarrow$ Crimson with jitter under 20%.
4. **Audio & Haptic Feedback**:
   - Double-tone chime for QR check-in; drumroll loop for suspense; victory fanfare + confetti for Rank #1.

---

## 📝 5. Copy-Paste Google Flow "Agent Instructions" (2D Vector System)

Copy the exact text block below and paste it directly into the **Agent Instructions** panel in Google Flow:

```text
ADANI UNIVERSITY BRAND & 2D VECTOR GENERATION GUIDELINES

1. BRAND IDENTITY & PALETTE:
- Primary Color Spectrum: Adani Teal (#008CA8), Royal Blue (#2D4C9C), Persia Violet (#633A8C), Crimson Maroon (#CE235B / #BD3861).
- Canvas: Clean warm off-white (#FAF7F2 / #FDFBF9) or crisp pure white (#FFFFFF).
- Aesthetic Persona: Prestigious Indian MBA University, professional first, minimalist corporate UI precision, clean 2D vector graphics.

2. 2D VECTOR CONSISTENCY FORMULA:
- Style: Clean 2D flat vector iconography, flat color fills, crisp sharp outlines, zero 3D glossy reflections, zero bevel shadows.
- Camera View: Always flat 0-degree straight-on front view (no tilted angles or 3D perspective).
- Container Shape: Always encased inside a smooth circular silver border ring.
- Background: ALWAYS isolated on a seamless pure solid white background (#FFFFFF) with sharp high-contrast cutout edges and NO background drop-shadows.

3. STRICT NEGATIVE PROMPT:
- Do NOT generate: 3D render, glossy reflections, bevel shadows, tilted view, realistic smoke/fire, dark background, grey background, shadow on canvas, blurry texture, noisy background, text overlay, cartoonish mascot, medieval weapons, distorted shapes.

4. 4 STANDING TIERS (2D VECTOR):
- Ember (Tier 1): Flat vector crimson maroon (#BD3861) and amber flame symbol inside circular silver ring.
- Volt (Tier 2): Flat vector Honolulu Blue (#2D4C9C) and Teal (#008CA8) lightning bolt symbol inside circular silver ring.
- Current (Tier 3): Flat vector Persia Violet (#633A8C) energy shield symbol inside circular silver ring.
- Plasma (Tier 4): Flat vector Adani spectrum gradient (#008CA8 to #CE235B) 8-point starburst symbol inside circular silver ring.
```

