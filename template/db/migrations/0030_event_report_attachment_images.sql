-- 0030_event_report_attachment_images — Phase C: real uploaded images for
-- Event Report Attachments (not just a checklist), plus attendance-graph
-- data. Each attachment_* boolean becomes an array of Storage paths — the
-- checklist item now reads as "checked" purely from the array being
-- non-empty (no separate boolean to drift out of sync with what was
-- actually uploaded). public_event_stats() gains total_registered so the
-- report page can show a simple registered-vs-attended bar, reusing
-- event_registrations (Phase 2, decision 47) rather than adding a new table.

-- migrate:up

alter table event_reports add column if not exists attachment_attendance_list_paths text[] not null default '{}';
alter table event_reports add column if not exists attachment_brochure_paths text[] not null default '{}';
alter table event_reports add column if not exists attachment_geo_photos_paths text[] not null default '{}';
alter table event_reports add column if not exists attachment_media_coverage_paths text[] not null default '{}';

update event_reports set attachment_attendance_list_paths = '{}' where attachment_attendance_list_paths is null;

alter table event_reports drop column if exists attachment_attendance_list;
alter table event_reports drop column if exists attachment_brochure;
alter table event_reports drop column if exists attachment_geo_photos;
alter table event_reports drop column if exists attachment_media_coverage;

drop function if exists public.public_event_stats(uuid);
create or replace function public.public_event_stats(p_event_id uuid)
returns table (total_attendees integer, total_joules integer, total_registered integer)
language sql stable security definer set search_path = public
as $$
  select
    (select count(distinct student_id)::integer from joule_transactions where event_id = p_event_id and type = 'event_scan'),
    (select coalesce(sum(amount), 0)::integer from joule_transactions where event_id = p_event_id and type = 'event_scan'),
    (select count(*)::integer from event_registrations where event_id = p_event_id);
$$;
grant execute on function public.public_event_stats(uuid) to anon, authenticated;

insert into storage.buckets (id, name, public) values ('event-report-attachments', 'event-report-attachments', true)
on conflict (id) do nothing;

create policy "anyone reads event-report-attachments bucket" on storage.objects for select
  using (bucket_id = 'event-report-attachments');
create policy "committee member or professor writes event-report-attachments bucket" on storage.objects for insert
  with check (bucket_id = 'event-report-attachments' and public.is_committee_member_or_professor());
create policy "committee member or professor updates event-report-attachments bucket" on storage.objects for update
  using (bucket_id = 'event-report-attachments' and public.is_committee_member_or_professor());
create policy "committee member or professor deletes event-report-attachments bucket" on storage.objects for delete
  using (bucket_id = 'event-report-attachments' and public.is_committee_member_or_professor());

-- migrate:down

drop policy if exists "committee member or professor deletes event-report-attachments bucket" on storage.objects;
drop policy if exists "committee member or professor updates event-report-attachments bucket" on storage.objects;
drop policy if exists "committee member or professor writes event-report-attachments bucket" on storage.objects;
drop policy if exists "anyone reads event-report-attachments bucket" on storage.objects;
delete from storage.buckets where id = 'event-report-attachments';

drop function if exists public.public_event_stats(uuid);
create or replace function public.public_event_stats(p_event_id uuid)
returns table (total_attendees integer, total_joules integer)
language sql stable security definer set search_path = public
as $$
  select count(distinct student_id)::integer, coalesce(sum(amount), 0)::integer
  from joule_transactions
  where event_id = p_event_id and type = 'event_scan';
$$;
grant execute on function public.public_event_stats(uuid) to anon, authenticated;

alter table event_reports add column if not exists attachment_attendance_list boolean not null default false;
alter table event_reports add column if not exists attachment_brochure boolean not null default false;
alter table event_reports add column if not exists attachment_geo_photos boolean not null default false;
alter table event_reports add column if not exists attachment_media_coverage boolean not null default false;

alter table event_reports drop column if exists attachment_attendance_list_paths;
alter table event_reports drop column if exists attachment_brochure_paths;
alter table event_reports drop column if exists attachment_geo_photos_paths;
alter table event_reports drop column if exists attachment_media_coverage_paths;
