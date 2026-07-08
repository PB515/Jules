# Skills library — INDEX

*The master shelf of Claude Code skills. The **whole** library is copied into each new project's `.claude/skills/` at kickoff, so the build agent has them locally and self-activates whichever the task needs (skills trigger by description — no manual calling). Maintain only this master; never patch a project's copy in place (Safety Rail: the skills library).*

*Charter §8 guardrail: do **not** add skills beyond these three. Most gaps want a pattern, not a skill.*

| Skill | Purpose | Status |
|---|---|---|
| `frontend-design/` | Overall craft — distinctive type, committed colour, composition; avoids generic AI aesthetics. Steer to the brand via doc 04 + the Brief (never its bold default); verify WCAG contrast at launch. | ✅ present |
| `taste-skill/` | Brand-kit / taste layer (the `brandkit` skill) — design judgement and anti-laziness craft. | ✅ present |
| `motion/` | The named motion pieces (pop-in · reveal · bounce) + reduced-motion. JS-driven (Motion lib) → no-JS / reduced-motion / mobile-Lighthouse checks apply. | ✅ present *(reconstructed from spec — see the skill's note)* |

The visual-layer wiring lives in `docs/modules/anti-ai-look.md` (tokens-before-UI, the tells, the AA-contrast CTA rule) and `tooling/ai-tell-lint` (copy hygiene on pre-commit).
