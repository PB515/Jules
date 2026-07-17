-- 0036_live_round_realtime_delete_fix — the real root cause behind the
-- reported "1 team, 3 students joined" host-lobby drift. Decision (see
-- CLAUDE.md) had already fixed the client to refetch true counts on any
-- realtime change instead of hand-incrementing — proven correct on a fresh
-- page load — but a *live*, no-reload update still never arrived after a
-- student left a team, because a DELETE never actually reached the
-- subscriber in the first place.
--
-- Root cause: both tables default to REPLICA IDENTITY DEFAULT (Postgres only
-- includes primary-key columns in a DELETE's old-row replication data).
-- Neither table's primary key includes round_id — live_round_team_members'
-- PK is (team_id, student_id), live_round_teams' PK is just id — so a DELETE
-- event's old row literally doesn't carry round_id at all. Supabase
-- Realtime's postgres_changes filter (`round_id=eq.<x>`) can't be evaluated
-- against a payload missing that column, so it silently drops the event
-- rather than deliver a possibly-wrong match. REPLICA IDENTITY FULL makes
-- Postgres include every column of the old row, which is what a filtered
-- DELETE subscription actually needs.

-- migrate:up

alter table live_round_teams replica identity full;
alter table live_round_team_members replica identity full;

-- migrate:down

alter table live_round_teams replica identity default;
alter table live_round_team_members replica identity default;
