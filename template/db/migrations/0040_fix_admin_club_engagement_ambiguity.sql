-- 0040: fix a real ambiguous-column bug in admin_club_engagement(), the
-- same class already documented in decision 25 (RETURNS TABLE implicitly
-- declares every output column as a PL/pgSQL variable for the whole
-- function body). admin_club_engagement()'s own return signature has a
-- column literally named club_id, which collided with
-- `select club_id into v_club_id from admins where id = auth.uid()` added
-- in 0039 — caught live by testing the migration immediately after
-- applying it, not by inspection. Fixed by qualifying with a table alias.

-- migrate:up

create or replace function public.admin_club_engagement()
returns table (club_id uuid, club_name text, total_joules integer, total_attendees integer)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_club_id uuid;
begin
  if not public.is_committee_member_or_professor() and not public.is_super_admin() then
    raise exception 'not authorized';
  end if;
  select a.club_id into v_club_id from admins a where a.id = auth.uid();

  return query
    select
      c.id,
      c.name,
      coalesce(sum(jt.amount), 0)::integer,
      count(distinct jt.student_id)::integer
    from clubs c
    left join events e on e.club_id = c.id
    left join joule_transactions jt on jt.event_id = e.id and jt.type = 'event_scan'
    where public.is_super_admin() or c.id = v_club_id
    group by c.id, c.name
    order by c.name;
end;
$$;

-- migrate:down

create or replace function public.admin_club_engagement()
returns table (club_id uuid, club_name text, total_joules integer, total_attendees integer)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_club_id uuid;
begin
  if not public.is_committee_member_or_professor() and not public.is_super_admin() then
    raise exception 'not authorized';
  end if;
  select club_id into v_club_id from admins where id = auth.uid();

  return query
    select
      c.id,
      c.name,
      coalesce(sum(jt.amount), 0)::integer,
      count(distinct jt.student_id)::integer
    from clubs c
    left join events e on e.club_id = c.id
    left join joule_transactions jt on jt.event_id = e.id and jt.type = 'event_scan'
    where public.is_super_admin() or c.id = v_club_id
    group by c.id, c.name
    order by c.name;
end;
$$;
