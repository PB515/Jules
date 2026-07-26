# Skills library — INDEX

*The master shelf of Claude Code skills. The **whole** library is copied into each new project's `.claude/skills/` at kickoff, so the build agent has them locally and self-activates whichever the task needs (skills trigger by description — no manual calling). Maintain only this master; never patch a project's copy in place (Safety Rail: the skills library).*

*The IDP's own "do not exceed three" cap is retired (see the IDP's `docs/skills-sop.md`) — the real gate on adding more is "repeated, proven need a pattern can't cover," not a hard count.*

| Skill | Purpose | Status |
|---|---|---|
| `discovery/` | Turns a fuzzy client idea into a structured, buildable brief (feature → capability → craft tier). Step 0. | ✅ present |
| `frontend-design/` | Overall craft — distinctive type, committed colour, composition; avoids generic AI aesthetics. Steer to the brand via doc 04 + the Brief (never its bold default); verify WCAG contrast at launch. | ✅ present |
| `taste-skill/` | Brand-kit / taste layer (the `brandkit` skill) — design judgement and anti-laziness craft. | ✅ present |
| `motion/` | The named motion pieces (pop-in · reveal · bounce) + reduced-motion. JS-driven (Motion lib) → no-JS / reduced-motion / mobile-Lighthouse checks apply. | ✅ present *(reconstructed from spec — see the skill's note)* |
| `gsap-core/`, `-timeline/`, `-scrolltrigger/`, `-react/`, `-frameworks/`, `-plugins/`, `-performance/`, `-utils/` | GSAP — second sanctioned animation library alongside Motion, for complex timeline/scroll/SVG choreography. Pulled in from the IDP's 2026-07 batch for the Goal-2 frontend revamp (solarpunk direction, "interactivity everywhere"). | ✅ present *(added this session, unvalidated on a real build yet)* |
| `ui-ux-pro-max/` | Searchable design-intelligence reference — palettes, font pairings, UX guidelines, 10 stacks. Reference tool, not a build-pipeline change. | ✅ present *(added this session)* |

The visual-layer wiring lives in `docs/modules/anti-ai-look.md` (tokens-before-UI, the tells, the AA-contrast CTA rule) and `tooling/ai-tell-lint` (copy hygiene on pre-commit).
