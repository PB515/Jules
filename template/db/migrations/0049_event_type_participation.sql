-- 0049: events.type's 'standard_meeting' value renamed to 'participation'
-- (and its Joule value dropped from 10 to match), per the professor's
-- explicit request: exactly 3 event types going forward — Expert Session,
-- Volunteer, Participation. The frontend's JOULE_BY_TYPE map (which is
-- what actually sets an event's joule_value at creation/edit time) is
-- updated in the same pass to expert_session: 5, volunteer_task: 15,
-- participation: 10.
--
-- Standing migration-ordering rule from decisions 46/49: drop the
-- constraint, THEN write the data, THEN add the new constraint — never
-- the reverse, since writing 'participation' rows while the old
-- constraint is still live would be rejected.
--
-- A second, separate constraint (events_joule_value_check) hardcodes the
-- three legal joule_value amounts to (10, 25, 50) — found by querying the
-- live schema before writing this migration, not assumed. Left
-- undiscovered, this would have silently rejected every new event
-- created at the new 5/15 point values. Widened to (5, 10, 15) to match
-- JOULE_BY_TYPE's new values exactly, no more and no fewer.
--
-- CORRECTED: the first version of this migration was NOT retroactive on
-- joule_value, on the theory that existing events' already-set amounts
-- (10/25/50) could be left untouched. That's wrong — the new
-- events_joule_value_check constraint only allows (5, 10, 15), so any
-- existing row still holding 25 (expert_session) or 50 (volunteer_task)
-- violates the new constraint the instant it's added, and `ADD CONSTRAINT`
-- fails against real data before it ever reaches a new event. Fixed by
-- retroactively remapping every existing event's joule_value to its type's
-- new value, in the same up-migration, before the new constraint goes on.
-- Historical joule_transactions.amount rows are unaffected either way,
-- since that amount was fixed at scan-time and never re-derives from the
-- event row.

-- migrate:up

alter table events drop constraint if exists events_type_check;
alter table events drop constraint if exists events_joule_value_check;

update events set type = 'participation' where type = 'standard_meeting';

update events set joule_value = 5 where type = 'expert_session';
update events set joule_value = 15 where type = 'volunteer_task';
update events set joule_value = 10 where type = 'participation';

alter table events add constraint events_type_check
  check (type in ('participation', 'expert_session', 'volunteer_task', 'surge'));
alter table events add constraint events_joule_value_check
  check (joule_value = any (array[5, 10, 15]));

-- migrate:down

alter table events drop constraint if exists events_type_check;
alter table events drop constraint if exists events_joule_value_check;

update events set type = 'standard_meeting' where type = 'participation';

update events set joule_value = 25 where type = 'expert_session';
update events set joule_value = 50 where type = 'volunteer_task';
update events set joule_value = 10 where type = 'standard_meeting';

alter table events add constraint events_type_check
  check (type in ('standard_meeting', 'expert_session', 'volunteer_task', 'surge'));
alter table events add constraint events_joule_value_check
  check (joule_value = any (array[10, 25, 50]));
