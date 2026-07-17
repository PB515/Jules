-- 0033_event_report_coordinators_list — the real AU "Event Completion Report"
-- template shows two numbered Coordinator slots, but the app only ever
-- stored one (`coordinator_name text`). Confirmed directly with the user:
-- events regularly have more than one coordinator, so this becomes a real
-- list, matching how objectives/outcomes already work (a text[] column,
-- rendered as a numbered list in the doc/UI).
--
-- No real event_reports data exists yet beyond dev/demo testing (confirmed
-- before writing this) — a clean column-type swap, not a data migration.

-- migrate:up

alter table event_reports add column if not exists coordinators text[] not null default '{}';
update event_reports set coordinators = array[coordinator_name] where coordinator_name <> '' and coordinators = '{}';
alter table event_reports drop column if exists coordinator_name;

-- migrate:down

alter table event_reports add column if not exists coordinator_name text not null default '';
update event_reports set coordinator_name = coordinators[1] where array_length(coordinators, 1) > 0;
alter table event_reports drop column if exists coordinators;
