-- 0007_jules_seed — runtime config the app needs to boot. No fake people, no
-- fake credentials/testimonials — just the two structural placeholders the
-- spec itself flags (CLAUDE.md decisions 9 & 10), clearly labeled so nobody
-- mistakes them for real facts. Bootstrapping the first Owner admin account is
-- a separate manual step — see docs/runbooks/ (Supabase Auth needs the Admin
-- API, not a plain SQL insert, to create a user with a real password).

-- migrate:up

insert into institution_settings (id, allowed_domains)
values (true, array['yourcollege.edu']) -- ★ PLACEHOLDER — replace before launch
on conflict (id) do nothing;

insert into app_secrets (key, value)
values ('qr_secret', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- ★ PLACEHOLDER calendar (spec §9) — replace with the real registrar dates
-- before the first season launches. Both rows exist so "today" lands inside
-- one of them regardless of when this migration is applied; the Owner can
-- edit/add seasons from the Institution Settings screen at any time.
insert into seasons (label, start_date, end_date, cadence)
select 'Even/Winter 2025-26 (placeholder calendar)', date '2025-12-16', date '2026-05-31', 'semester'
where not exists (select 1 from seasons where label = 'Even/Winter 2025-26 (placeholder calendar)');

insert into seasons (label, start_date, end_date, cadence)
select 'Odd/Monsoon 2026 (placeholder calendar)', date '2026-07-01', date '2026-12-15', 'semester'
where not exists (select 1 from seasons where label = 'Odd/Monsoon 2026 (placeholder calendar)');

-- migrate:down

delete from seasons where label in (
  'Even/Winter 2025-26 (placeholder calendar)',
  'Odd/Monsoon 2026 (placeholder calendar)'
);
delete from app_secrets where key = 'qr_secret';
delete from institution_settings where id = true;
