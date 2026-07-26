# 🚀 Master Handoff Guide for Claude: Synergy — Adani University FMS Platform

> **Project Target**: Public Marketing & Portal Site (`public_site_prototype.html` & Next.js repo in `template/`)  
> **Brand**: Synergy Operating System — Faculty of Management Sciences (FMS), Adani University  
> **Handoff Objective**: Full UI/UX Implementation, Multi-Page Buildout, & Interactive Micro-Animations  
> **Date**: July 27, 2026

---

## 📌 Executive Summary & Design Principles

The user has approved the **Master Design Blueprint & Header Navigation Lockup** in `public_site_prototype.html`. You are tasked with completing the full Next.js application buildout, implementing all secondary pages, refining color palettes, and making the entire platform feel interactive, lively, and state-of-the-art.

---

## 🎨 1. Palette & Background Color Directive

> [!IMPORTANT]
> **BACKGROUND COLOR UPDATE**: Shift away from warm off-white / cream (`#FDFBF9`). The background canvas must use **Pure Crisp Solid White (`#FFFFFF`)** and modern cool shades of slate-white (`#F8FAFC` / `#F1F5F9`). **DO NOT USE CREAM / BEIGE.**

### Master Brand Color System:
* **Primary Canvas Background**: `#FFFFFF` (Pure Solid White)
* **Secondary Surface / Section Fill**: `#F8FAFC` (Cool Crisp Slate-50) & `#F1F5F9` (Slate-100 border/surface)
* **Adani Brand Accent Colors**:
  * **Adani Teal**: `#008CA8` (Primary Action & Verification)
  * **Royal Blue**: `#2D4C9C` (Logistics & Institutional Accent)
  * **Persia Violet**: `#633A8C` (Finance & Academic Leadership)
  * **Crimson Maroon**: `#BD3861` / `#CE235B` (FMS Chair & High Energy Accent)
  * **Executive Slate Dark**: `#0F172A` (Secondary CTAs & Card Overlays)
* **Spectrum Gradient Utility**:  
  `linear-gradient(135deg, #008CA8 0%, #2D4C9C 35%, #633A8C 70%, #CE235B 100%)`

---

## 🏛️ 2. Approved Header Navbar & Brand Lockup

The top header is a floating rounded container pill featuring:
1. **Official Adani University Logo**: `official_adani_university_logo.png` (`h-9` / 36px height)
2. **Vertical Divider Line**: `1.5px` width in `#E2E8F0`
3. **User-Approved Canva Synergy Wordmark**: `synergy_combination_wordmark.png` (`h-9` / 36px height — features dual orbital rings + Maroon lightning bolt + `SYN⚡RGY` typography)
4. **Navbar Links** (Exact Order):
   * `Home` (Active tab underline in Crimson Maroon `#BD3861`)
   * `Events`
   * `Event Reports`
   * `Clubs`
   * `Leaderboard`
   * `Gallery`
   * *(Note: `More v` dropdown has been REMOVED by user directive)*
5. **Primary Header CTA**: Rounded spectrum gradient button (`Install App / Login`)

---

## 🖥️ 3. Approved Hero Section Blueprint (Section #10)

The Hero Section (**Section #10**) is a **100% Wall-to-Wall Full-Bleed Split Hero** (`h-[calc(100vh-80px)]` on desktop) that fits **100% inside ONE SINGLE SCREEN above the fold with ZERO vertical scrolling required**:

### Left Column (Text & CTAs):
* **Element #1 (Eyebrow Pill)**: `FACULTY OF MANAGEMENT SCIENCES (FMS)`
* **Element #2 (Main Headline)**: `Progress, Together.` with spectrum gradient text
* **Element #3 (Subtitle)**: Synergy FMS OS description
* **Elements #4, #5, #6 (Impact Stats)**: `9 FMS Clubs`, `4 Standing Tiers`, `100% SOP Verified`
* **Element #8 (Primary CTA)**: `I'm an MBA Student ->` (Spectrum Gradient)
* **Element #9 (Secondary CTA)**: `Faculty Command Center` (Dark Charcoal)
* **Horizontal Positioning**: Shifted rightwards (`pl-12 lg:pl-24`) for balanced editorial symmetry.

### Right Column (Card #7):
* **Card #7**: Wall-to-Wall full-bleed **Event Showcase Carousel** (`lg:col-span-5 w-full h-full`) sitting 100% flush against the right edge of the screen.
* **Features**: Auto-swiping event photos, live club badges (`Joules Club`, `Gati Club`, `Marketing Mavericks`), Joules payouts (`+250 J`), slide titles, and floating glassmorphism `<` `>` prev/next controls with dot indicators.

---

## 🚀 4. Full Page Building Roadmap (All Secondary Pages)

Using `public_site_prototype.html` as the master design system benchmark, build out all remaining application pages:

### 1. `/events` (Live & Scheduled Events Directory)
* **Design**: Crisp white canvas with filter tabs (`All`, `Energy`, `Logistics`, `Finance`, `Marketing`, `Tech`).
* **Content**: Event cards showing date, club host, speaker, location, Joules points (`+150 J` to `+300 J`), and `RSVP / QR Check-In` modal trigger.

### 2. `/event-reports` (SOP Event Reports Submission & Approval Flow)
* **Design**: Executive document table layout.
* **Content**: List of submitted club event reports with SOP status tags (`Pending Faculty Review`, `Approved`, `Joules Credited`), downloadable PDF reports, and faculty approval signatures.

### 3. `/clubs` (The 9 MBA FMS Clubs Directory)
* **Design**: 3x3 interactive card grid featuring high-res cover photos.
* **Clubs**:
  1. *Joules Club* (Energy Sector)
  2. *Gati (गति) Club* (Logistics Sector)
  3. *Cityscape Club* (Urban & Real Estate)
  4. *Shastra Club* (Finance & Policy)
  5. *Marketing Mavericks* (Digital Marketing)
  6. *Nexus Club* (Operations & Quality)
  7. *StratEdge Club* (Start-up & Tech)
  8. *Film Club* (Communication & Cinema)
  9. *SRISTI Club* (Societal Welfare)
* **Interactivity**: Clicking any club opens a rich detail modal with mentor details, student head details, past conclaves, and upcoming workshops.

### 4. `/leaderboard` (Joules Standing Tiers & Student Rankings)
* **Design**: Executive leaderboard table with tier badge filters (`Ember 0-999J`, `Volt 1000-2499J`, `Current 2500-4999J`, `Plasma 5000J+`).
* **Content**: Student names, MBA batch, total Joules earned, club check-ins count, and tier badges.

### 5. `/gallery` (Campus Conclave & Event Media Gallery)
* **Design**: Masonry media grid with lightbox preview modal.
* **Content**: Event photos and 4-second motion graphics videos (`hero_01` to `hero_06`).

### 6. `/student-pwa` (MBA Student Execution OS)
* **Design**: Mobile-first PWA layout with QR code scanner modal, Joule balance counter, active Surge quiz widget, and tier status progress bar.

### 7. `/admin-pwa` (Faculty Command Center)
* **Design**: Executive analytics dashboard with Dr. Riya Mehta's chair controls, SOP report approval queue, QR code generator, and student Joule audit logs.

---

## ⚡ 5. Interactivity & Micro-Animations Blueprint

Make the site feel alive and dynamic:
1. **Smooth Hover Scale**: `hover:scale-[1.02] active:scale-[0.98] transition-all duration-300` on buttons and cards.
2. **Auto-Swiping Event Carousel**: 4-second smooth fade/slide interval with manual prev/next button controls.
3. **Animated Numbers & Progress Bars**: Joules point counters animate up from 0 when visible.
4. **Subtle Background Floating Icons**: Accent symbols (`⚡`, `🛡️`, `🤝`, `🚀`) floating softly in outer side margins with zero text/card overlap.
5. **Interactive Modals**: Smooth backdrop blur (`backdrop-blur-md bg-slate-900/40`) when opening event RSVP, club details, or login modals.

---

## 📂 6. Local Asset Paths Manifest

All 22 media assets are saved and ready in the project repository:
* **Local Folder**: `C:\Users\bpurv\OneDrive\Desktop\Website\jules\Images & Videos\`
* **Next.js Sync Path**: `C:\Users\bpurv\OneDrive\Desktop\Website\jules\template\public\images\`

### Logos:
* `official_adani_university_logo.png`
* `synergy_combination_wordmark.png` (User's custom Canva `SYN⚡RGY` logo)
* `app_icon_synergy_logo.png`
* `app_icon_admin_synergy_logo.jpeg`

### Tier Badges (2D Generated):
* `tier_01_ember_badge.jpeg`
* `tier_02_volt_badge.jpeg`
* `tier_03_current_badge.jpeg`
* `tier_04_plasma_badge.jpeg`

### 9 FMS Club Covers:
* `club_01_joules_energy_cover.jpeg`
* `club_02_gati_logistics_cover.jpeg`
* `club_03_cityscape_real_estate_cover.jpeg`
* `club_04_shastra_finance_cover.jpeg`
* `club_05_marketing_mavericks_cover.jpeg`
* `club_06_nexus_operations_cover.jpeg`
* `club_07_stratedge_innovation_cover.jpeg`
* `club_08_film_club_cover.jpeg`
* `club_09_sristi_welfare_cover.jpeg`

---

## 📋 Copy-Paste Prompt for Claude

```text
Hi Claude! We have finalized the master UI design system and public site prototype for Synergy — Adani University Faculty of Management Sciences (FMS).

Please review the master design blueprint in `public_site_prototype.html` and follow these directives:

1. BACKGROUND COLOR: Shift from warm off-white / cream to Pure Solid White (`#FFFFFF`) and cool crisp slate-white (`#F8FAFC`). Do NOT use cream or beige.
2. HEADER NAVBAR: Keep the floating container pill navbar featuring official_adani_university_logo.png + divider + synergy_combination_wordmark.png (Canva SYN⚡RGY logo) + navbar links (Home, Events, Event Reports, Clubs, Leaderboard, Gallery) + Install App / Login button. (Note: More dropdown is removed).
3. HERO SECTION (#10): Keep the 100% wall-to-wall split hero (h-[calc(100vh-80px)]) with left text shifted rightwards (pl-12 lg:pl-24) and Card #7 (Event Carousel) sitting 100% flush to the right browser wall. All CTAs (#8 & #9) fit 100% above the fold with zero scrolling.
4. FACULTY CHAIR SECTION: Include Dr. Riya Mehta's Faculty Chair SOP section right below the hero.
5. SECONDARY PAGES: Build out /events, /event-reports, /clubs (the 9 FMS clubs with modals), /leaderboard, /gallery, /student-pwa, and /admin-pwa using this exact design language.
6. INTERACTIVITY: Implement smooth micro-animations, hover effects, tab filtering, auto-swiping carousel, and interactive modals.
```

---
*End of Master Handoff Guide*
