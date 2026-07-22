-- 0042: a real, serious club-scoping leak found live-testing 0038/0039 —
-- event_reports' pre-existing "anyone reads event reports" policy (0019,
-- `using (true)`, needed for the legitimate public Event Reports pages)
-- combines permissively (OR) with the newer club-scoped "staff manages own
-- club event reports" policy (0038), which means the blanket public policy
-- silently defeated the scoped one for EVERY reader, staff included — a
-- Committee Member could read (and, via the admin list, see) every other
-- club's reports. Confirmed live: Cityscape's CM saw Shastra/StratEdge
-- Club reports in their own Event Reports list.
--
-- RLS can't tell "give me report X" (the legitimate public single-report
-- page) apart from "give me every report" (an admin bulk list) — both are
-- just SELECT queries evaluated against the same policy. The fix used
-- everywhere else in this app for exactly this shape (public_events(),
-- public_clubs(), public_event_stats()) applies here too: drop the blanket
-- table-level policy entirely, route the two legitimate PUBLIC reads
-- through new narrow RPCs, and let the raw table become staff-only,
-- properly club-scoped.

-- migrate:up

drop policy if exists "anyone reads event reports" on event_reports;

create or replace function public.public_event_reports()
returns table (id uuid, title text, event_id uuid, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select id, title, event_id, created_at from event_reports order by created_at desc;
$$;
revoke all on function public.public_event_reports() from public;
grant execute on function public.public_event_reports() to anon, authenticated;

create or replace function public.public_event_report(p_id uuid)
returns table (
  id uuid, title text, event_id uuid, coordinators text[],
  introduction text, objectives text[], event_highlights text,
  outcomes text[], conclusion text,
  attachment_attendance_list_paths text[], attachment_brochure_paths text[],
  attachment_geo_photos_paths text[], attachment_media_coverage_paths text[],
  created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    id, title, event_id, coordinators,
    introduction, objectives, event_highlights,
    outcomes, conclusion,
    attachment_attendance_list_paths, attachment_brochure_paths,
    attachment_geo_photos_paths, attachment_media_coverage_paths,
    created_at
  from event_reports where id = p_id;
$$;
revoke all on function public.public_event_report(uuid) from public;
grant execute on function public.public_event_report(uuid) to anon, authenticated;

-- migrate:down

drop function if exists public.public_event_report(uuid);
drop function if exists public.public_event_reports();

create policy "anyone reads event reports" on event_reports
  for select using (true);
