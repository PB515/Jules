# Runbook — Jules local setup

*The sequence to go from a fresh clone to a running app with a logged-in Owner.
No Docker was available in the environment this was built in, so none of this
has been run end-to-end yet — treat it as the documented, reasoned-through
path, not a verified one. Report back anything that doesn't match.*

## 1. Install

```
npm run setup          # installs root + template/ deps, runs the doctor check
```

## 2. Start local Supabase

Requires Docker Desktop running.

```
npm run db:start       # supabase start — prints your local URL + anon key + service_role key
```

## 3. Fill secrets

```
cp template/.env.example template/.env.local
```

Paste in the three values `supabase start` printed:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`DATABASE_URL` can stay as the default local value already in `.env.example`.

## 4. Apply migrations

```
npm run migrate:up     # applies 0001-0009, regenerates lib/supabase/database.types.ts
```

This seeds `institution_settings` (placeholder domain `yourcollege.edu`), a
random `qr_secret`, and two placeholder seasons (see CLAUDE.md decisions 9 &
10 — replace both before a real launch).

## 5. Create the first Owner

There's no admin self-signup (by design — see docs/project-spec.md §7), so the
very first Owner account is created directly, once:

```
npm run bootstrap:owner you@yourcollege.edu "Your Name"
```

Prints a one-time temporary password — log in at `/admin/login` with it, then
manage every further admin (Officers, Volunteers) from **Institution
Settings → Admin roster** inside the app.

## 6. Run the app

```
cd template && npm run dev
```

Student signup is at `/signup` (only e-mails on the `allowed_domains` list —
edit that list at **Institution Settings** before onboarding real students).

## Known gaps to verify once Docker/a real Supabase project is available

- The full migration set (0003-0009) has been reviewed for internal
  consistency (matching up/down, RBAC leak check — see CLAUDE.md build log)
  but never actually run against Postgres. Run `npm run migrate:up` and watch
  for the first real error.
- `lib/supabase/database.types.ts` is hand-written from the migrations, not
  generated. Run `npm run db:types` once the local stack is up and diff it —
  it should regenerate to something structurally equivalent; if it doesn't,
  the migrations and this file have drifted and the generated one wins.
- The QR Scan Station shows a copyable check-in link + a large text code
  instead of a scannable QR image (no QR-rendering dependency was added
  without asking first — see CLAUDE.md build log). Wiring a real QR image is a
  one-line dependency decision away.
