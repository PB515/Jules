-- 0019_rename_afterglow_to_event_reports — "Afterglow" becomes "Event
-- Report" as part of the Synergy rebrand, and gains the structured-
-- template fields the professor's "report builder" ask needs (same
-- feature, not a second one — see CLAUDE.md). `body` (freeform) becomes
-- `summary` (a short paragraph) plus a new `highlights` array, so the
-- authoring form can be "fill the gaps" rather than write-from-scratch.

-- migrate:up

alter table afterglow_posts rename to event_reports;
alter index idx_afterglow_created rename to idx_event_reports_created;

alter table event_reports rename column body to summary;
alter table event_reports add column highlights text[] not null default '{}';

drop policy if exists "anyone reads afterglow posts" on event_reports;
drop policy if exists "officer or owner manages afterglow posts" on event_reports;

create policy "anyone reads event reports" on event_reports
  for select using (true);
create policy "officer or owner manages event reports" on event_reports
  for all using (public.is_officer_or_owner()) with check (public.is_officer_or_owner());

-- migrate:down

drop policy if exists "officer or owner manages event reports" on event_reports;
drop policy if exists "anyone reads event reports" on event_reports;

alter table event_reports drop column highlights;
alter table event_reports rename column summary to body;

create policy "anyone reads afterglow posts" on event_reports
  for select using (true);
create policy "officer or owner manages afterglow posts" on event_reports
  for all using (public.is_officer_or_owner()) with check (public.is_officer_or_owner());

alter index idx_event_reports_created rename to idx_afterglow_created;
alter table event_reports rename to afterglow_posts;
