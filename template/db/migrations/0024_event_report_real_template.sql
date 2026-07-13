-- 0024_event_report_real_template — the Event Report authoring form (Phase 0,
-- decision 45) was built from a reasonable guess at what a "report style
-- form where everything is described in a pattern, just need to fill gaps"
-- (professor's point 10) should look like. The user has since shared the
-- REAL Adani University "Event Completion Report" template and a filled
-- example ("Bid to Build"), and it's a genuinely different, more detailed
-- shape than the guess: Event Name/Date/Time/Venue/Organised by/Coordinator,
-- then Introduction (paragraph), Objectives (bullets), Event Highlights
-- (a PARAGRAPH, not a bullet list — the Phase 0 guess had this backwards),
-- Outcomes (bullets, a field that didn't exist at all), Conclusion (its own
-- paragraph, previously conflated with a single "Summary"), and an
-- Attachments checklist. Rebuilt in place to match the real template exactly.
--
-- Confirmed with the user: Date/Time/Venue/Organised-by-club auto-fill from
-- the linked event (read-only) rather than being retyped — the event's
-- event_date/location/club_id are already the source of truth elsewhere in
-- the app, and this is exactly the "fill the gaps" philosophy the professor
-- asked for. `title` is kept (auto-derived from the event's own name at
-- creation, not user-entered) so the report's identity stays stable even if
-- the underlying event is later renamed.
--
-- No live data exists yet for event_reports (confirmed: 0 rows) — this is a
-- clean schema restructure, not a data migration.

-- migrate:up

alter table event_reports drop column if exists summary;
alter table event_reports drop column if exists highlights;

alter table event_reports add column if not exists coordinator_name text not null default '';
alter table event_reports add column if not exists introduction text not null default '';
alter table event_reports add column if not exists objectives text[] not null default '{}';
alter table event_reports add column if not exists event_highlights text not null default '';
alter table event_reports add column if not exists outcomes text[] not null default '{}';
alter table event_reports add column if not exists conclusion text not null default '';
alter table event_reports add column if not exists attachment_attendance_list boolean not null default false;
alter table event_reports add column if not exists attachment_brochure boolean not null default false;
alter table event_reports add column if not exists attachment_geo_photos boolean not null default false;
alter table event_reports add column if not exists attachment_media_coverage boolean not null default false;

-- public_events() gains the organising club's name — needed so the public
-- Event Report detail page can show "Organised by" without a second,
-- separate public RPC. Adding a column to a RETURNS TABLE is a return-type
-- change Postgres won't let CREATE OR REPLACE make (the exact restriction
-- decisions 46/47/48 already hit) — an explicit DROP is required first.
drop function if exists public.public_events();

create or replace function public.public_events()
returns table (id uuid, name text, type text, event_date timestamptz, location text, club_name text)
language sql stable security definer set search_path = public
as $$
  select e.id, e.name, e.type, e.event_date, e.location, c.name
  from events e
  left join clubs c on c.id = e.club_id
  where e.type <> 'surge' -- Surges aren't public check-in events
  order by e.event_date desc;
$$;
grant execute on function public.public_events() to anon, authenticated;

-- migrate:down

drop function if exists public.public_events();

create or replace function public.public_events()
returns table (id uuid, name text, type text, event_date timestamptz, location text)
language sql stable security definer set search_path = public
as $$
  select e.id, e.name, e.type, e.event_date, e.location
  from events e
  where e.type <> 'surge'
  order by e.event_date desc;
$$;
grant execute on function public.public_events() to anon, authenticated;

alter table event_reports drop column if exists attachment_media_coverage;
alter table event_reports drop column if exists attachment_geo_photos;
alter table event_reports drop column if exists attachment_brochure;
alter table event_reports drop column if exists attachment_attendance_list;
alter table event_reports drop column if exists conclusion;
alter table event_reports drop column if exists outcomes;
alter table event_reports drop column if exists event_highlights;
alter table event_reports drop column if exists objectives;
alter table event_reports drop column if exists coordinator_name;

alter table event_reports add column if not exists summary text not null default '';
alter table event_reports add column if not exists highlights text[] not null default '{}';
