# Verification checklist

*Standing list of what's confirmed vs. still needs confirming, on the current
Mumbai (`ap-south-1`) Supabase project. Update this as items get resolved —
don't let it go stale the way region-mismatch notes in CLAUDE.md's Known Open
Items sat unresolved across many sessions.*

## Mumbai migration — done

- [x] All 51 migrations applied to Mumbai, `db_meta` tracks the full history
- [x] The 9 real clubs recovered and inserted (from `docs/club-detail-pages-spec.md`)
- [x] Placeholder "General Club" deleted (no dependents)
- [x] `scripts/bootstrap-owner.ts`'s stale `role: 'owner'` fixed to `'super_admin'`
- [x] First Super Admin account bootstrapped (`bhavsarpurven515@gmail.com`)
- [x] `.env.local` and Vercel Production env vars point at Mumbai
- [x] `vercel.json` region set to `bom1`
- [x] Supabase Auth Site URL + Redirect URLs set on the Mumbai dashboard
- [x] `/api/health` → 200 on the redeployed production site
- [x] `/clubs` → exactly 9 real clubs, publicly
- [x] Admin login works with the bootstrapped account
- [x] Real event creation exercises `pgcrypto`/HMAC/QR token/RLS successfully
- [x] Storage bucket (`event-covers`) upload/fetch/delete works — RLS replayed correctly
- [x] Password-reset round-trip fires correctly (after fixing the `/forgot-password` bug)
- [x] `typecheck`/`lint`/`build` all clean

## Mumbai migration — still open

- [ ] **Set up a backup habit for Mumbai** (see CLAUDE.md's ★★ Known Open Item) — no rollback path exists if this project is lost too. Simplest: a periodic `pg_dump` via the pooler connection string.
- [ ] Confirm Preview/Development Vercel environments also point at Mumbai (only Production was confirmed)
- [ ] Regenerate `database.types.ts` for real once `supabase login` is possible interactively (currently hand-maintained, validated by `build` + live RPC calls, not a real `gen types` diff)

## Before onboarding any real students (pilot prerequisites)

- [ ] Replace the placeholder season/term dates (decision 9) with the real semester calendar — every season-scoped report/leaderboard/Joule total is silently wrong until this happens
- [x] Replace the placeholder college email domain (decision 10) with the real one — `allowed_domains` now `['adaniuni.ac.in']` (decision 87)
- [x] Create the additional Super Admin account(s) needed — Dr. Riya Mehta (`riya.mehta@adaniuni.ac.in`) added alongside the bootstrapped account (decision 87)
- [x] Bulk-create the real student roster — 243 real accounts created from the supplied Excel roster, 0 failures, credentials CSV delivered directly (not printed to chat) (decision 87). 2 rows skipped for missing emails (Madhav Sharma, Mohit Tilokchand Kumawat) — need their emails supplied separately.
- [ ] Flip `ALWAYS_SHOW_FOR_TESTING` back to `false` in both `launch-splash.tsx` and `admin-splash.tsx` — currently fires every login for demo purposes, would be annoying at real daily-use cadence

## Real-device confirmations still outstanding (pre-existing, not new from the migration)

- [ ] A real push notification landing on a real phone (enable on Profile → admin creates/edits an event → notification arrives)
- [ ] A real iPhone re-check of "Add to Home Screen" now that `apple-mobile-web-app-capable` is set (decision 76) — the fix is grounded in a real, confirmed gap but not independently proven end-to-end on hardware
- [ ] Multi-team Live Round behavior (2+ simultaneous teams) — reasoned correct from the RPC logic, only ever tested with one team live

## Ongoing habits worth keeping (lessons already paid for this session)

- After any client-code fix, verify in a **fresh browser tab** with the service worker unregistered and Cache Storage cleared first — Turbopack dev chunks aren't content-hashed, so a stale tab can look like a broken fix (decisions 57/60/65/66/77).
- Before trusting a migration against a live DB, run it via the pooler connection string (`aws-0-<region>.pooler.supabase.com:6543`), never the direct `db.<ref>.supabase.co:5432` host — IPv6-only, unreachable from this environment.
- Any `CREATE OR REPLACE FUNCTION` that changes a function's declared shape (params, return columns) needs an explicit `DROP FUNCTION` first — Postgres silently refuses or creates a phantom overload otherwise.
- Data-only writes (plain `INSERT`/`UPDATE`/`DELETE`) can be run directly; DDL touching RLS/`GRANT`/`SECURITY DEFINER` needs the user to run it by hand in Supabase's SQL Editor (the safety classifier blocks scripted mutations to security-relevant live-DB objects).
