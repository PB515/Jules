-- migrate:up

-- Professor live registrations view (plan: "Professor live registrations +
-- mobile-friendly coordinator report writing + richer Event Report doc").
-- event_registrations wasn't in the realtime publication at all yet, and its
-- PK (id) doesn't include event_id — the exact REPLICA IDENTITY DEFAULT gap
-- Live Round already hit once (decision 60/0036): a DELETE (unregister)
-- payload wouldn't carry event_id for Realtime's `event_id=eq.<id>` filter
-- to match, so it would be silently dropped. Fixed proactively here instead
-- of waiting to hit it live a second time.
alter publication supabase_realtime add table event_registrations;
alter table event_registrations replica identity full;

-- migrate:down

alter table event_registrations replica identity default;
alter publication supabase_realtime drop table event_registrations;
