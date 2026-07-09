-- 0013_jules_trusted_write_fix — a critical bug caught during live
-- verification: `_bump_streak()` (0006) sets `jules.trusted_write = on` before
-- updating a student's own streak_days/last_active_date, and its comment
-- claims the self-update-restriction trigger (0005) honors that flag — but
-- the trigger body never actually checked it, only `is_owner()`. Since
-- `_bump_streak` runs as the STUDENT (not the Owner), every call raised
-- "only name and phone are self-editable" and rolled back the ENTIRE calling
-- function's transaction — meaning every correct answer, anywhere in the
-- app (QR event scans, async Surge Mode, Live Round), silently failed to
-- award Joules from the moment this was built. Caught only by actually
-- submitting a live answer and checking joule_transactions, not by
-- typecheck/build/lint, which can't see this at all.

-- migrate:up

create or replace function public.trg_students_restrict_self_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_owner() or current_setting('jules.trusted_write', true) = 'on' then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.streak_days is distinct from old.streak_days
     or new.last_active_date is distinct from old.last_active_date
     or new.college_email is distinct from old.college_email then
    raise exception 'only name and phone are self-editable';
  end if;
  return new;
end;
$$;

-- migrate:down
-- No-op: 0005's own down migration already drops this trigger/function
-- entirely; this migration only ever changed the function body.
