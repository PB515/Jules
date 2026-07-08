# Skills SOP — the skill lifecycle (Tier-2 #10)

*How the skills library is maintained and grown. The master lives in `.claude/skills/`; the whole library is copied into each new project at kickoff. (Original `skills-library-sop.md` was not in the inputs; this captures the rule set from Safety Rail "skills library" + backlog entry 10.)*

## The model

- **One master, copied per project.** `.claude/skills/` is the single source of truth. At kickoff the *whole* library is copied into the new project's `.claude/skills/`, so the build agent self-activates whichever skill the task needs (skills trigger by their `description` — no manual calling).
- **Edit only the master.** Never patch a project's copy in place. Every NEW project copies the CURRENT master.
- **Each delivered site is pinned** to the skills it shipped with — improving the master later never changes a handed-off site (like pinned dependencies). This is deliberate: a global install would do the reverse.

## The members (charter §8 — do NOT exceed these three)

| Skill | Role |
|---|---|
| `frontend-design` | Overall craft — distinctive type/colour/composition. Steer to the brand via doc 04 + the Brief; verify WCAG contrast at launch. |
| `taste-skill` | Design judgement / brand-kit; anti-laziness pass. |
| `motion` | Named entrance pieces + reduced-motion / no-JS / mobile-Lighthouse checks. |

## Adding a skill (rare — most gaps want a pattern, not a skill)

Skills are big; patterns are small (charter §8). Before adding a skill, ask: *is this a repeated, proven need that a pattern can't cover?* If yes:

1. Author `SKILL.md` (frontmatter `name` + a precise `description` — the description is how it triggers).
2. Add it to the master `.claude/skills/` + the `INDEX.md`.
3. Validate it on a real build before trusting it (an entry from one build is a draft).
4. Log the addition in `CHANGELOG.md`; if it was a backlog item, mark it done.

## Maintenance

- Keep `INDEX.md` current (members + status).
- A skill's craft guidance must defer to the project's doc 04 + tokens — skills never override the brand.
- When a skill's default fights a rail (e.g. `frontend-design` reaching for a dependency), the rail wins unless the dependency is deliberately sanctioned (backlog 9 — Motion is the one sanctioned exception).
