-- =====================================================================
-- Migration 0015: Reservation + Monopoly enforcement
-- THE DATABASE IS THE SOURCE OF TRUTH. All of this runs inside a single
-- transaction with row locks / advisory locks so two concurrent requests
-- can never both win the same stall or the same monopoly category.
-- =====================================================================

-- ---------------------------------------------------------------------
-- release_expired_reservations() — sweep function, safe to call often
-- (called lazily inside reserve_stall(), and can also be scheduled via
-- pg_cron or an external cron hitting an API route)
-- ---------------------------------------------------------------------
create or replace function public.release_expired_reservations()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  with expired as (
    update public.stall_reservations
      set status = 'expired'
      where status = 'active' and expires_at < now()
      returning stall_id
  )
  update public.stalls s
    set status = 'available'
    from expired
    where s.id = expired.stall_id
      and s.status = 'reserved'
      -- never release a stall that already has a live (non-cancelled) allocation
      and not exists (
        select 1 from public.stall_allocations a
        where a.stall_id = s.id and a.status not in ('cancelled', 'completed')
      );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- assert_monopoly_available() — raises if booking p_category_id as
-- monopoly on p_event_id would violate exclusivity. Always called from
-- inside reserve_stall()/convert_reservation() while holding the
-- per-(event,category) advisory lock, so this check is race-free.
-- ---------------------------------------------------------------------
create or replace function public.assert_monopoly_available(
  p_event_id uuid, p_category_id uuid, p_exclude_reservation_id uuid default null
) returns void
language plpgsql
stable
as $$
declare
  v_scope text;
  v_conflict boolean;
begin
  if p_category_id is null then
    return; -- no category chosen yet — nothing to enforce until it's set
  end if;

  select coalesce(ec.monopoly_scope, 'event_category') into v_scope
  from public.event_categories ec
  where ec.event_id = p_event_id and ec.category_id = p_category_id;

  v_scope := coalesce(v_scope, 'event_category');

  if v_scope = 'none' then
    return;
  end if;

  if v_scope = 'event_wide' then
    -- any existing monopoly allocation or active reservation blocks ALL
    -- other monopoly bookings for the whole event
    select exists (
      select 1 from public.stall_allocations a
      join public.stalls s on s.id = a.stall_id
      join public.stall_types st on st.id = s.stall_type_id
      where a.event_id = p_event_id and st.monopoly_type = 'monopoly'
        and a.status not in ('cancelled', 'completed')
    ) or exists (
      select 1 from public.stall_reservations r
      join public.stalls s on s.id = r.stall_id
      join public.stall_types st on st.id = s.stall_type_id
      where r.event_id = p_event_id and st.monopoly_type = 'monopoly'
        and r.status = 'active' and r.expires_at > now()
        and r.id is distinct from p_exclude_reservation_id
    ) into v_conflict;
  else
    -- 'event_category' (default): exclusivity scoped to this category only
    select exists (
      select 1 from public.stall_allocations a
      join public.stalls s on s.id = a.stall_id
      join public.stall_types st on st.id = s.stall_type_id
      where a.event_id = p_event_id and a.category_id = p_category_id
        and st.monopoly_type = 'monopoly'
        and a.status not in ('cancelled', 'completed')
    ) or exists (
      select 1 from public.stall_reservations r
      join public.stalls s on s.id = r.stall_id
      join public.stall_types st on st.id = s.stall_type_id
      where r.event_id = p_event_id and r.category_id = p_category_id
        and st.monopoly_type = 'monopoly'
        and r.status = 'active' and r.expires_at > now()
        and r.id is distinct from p_exclude_reservation_id
    ) into v_conflict;
  end if;

  if v_conflict then
    raise exception 'MONOPOLY_UNAVAILABLE: category already booked as monopoly for this event'
      using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- reserve_stall() — the ONLY sanctioned way to put a hold on a stall.
-- Runs as the calling user (SECURITY INVOKER) but relies on
-- SECURITY DEFINER helpers above for cross-table monopoly checks.
-- ---------------------------------------------------------------------
create or replace function public.reserve_stall(
  p_stall_id uuid, p_category_id uuid default null
) returns public.stall_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_monopoly public.stall_monopoly;
  v_minutes int;
  v_max_stalls int;
  v_allow_multi boolean;
  v_existing_count int;
  v_reservation public.stall_reservations;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be signed in to reserve a stall' using errcode = 'P0001';
  end if;

  -- opportunistically clear out anything that expired
  perform public.release_expired_reservations();

  -- lock the stall row so two concurrent callers serialize here
  select s.event_id, st.monopoly_type
    into v_event_id, v_monopoly
  from public.stalls s
  join public.stall_types st on st.id = s.stall_type_id
  where s.id = p_stall_id
  for update of s;

  if v_event_id is null then
    raise exception 'STALL_NOT_FOUND' using errcode = 'P0001';
  end if;

  select e.reservation_minutes, e.max_stalls_per_user, e.allow_multiple_stalls
    into v_minutes, v_max_stalls, v_allow_multi
  from public.events e where e.id = v_event_id;

  if not (select status = 'available' from public.stalls where id = p_stall_id) then
    raise exception 'STALL_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  -- per-user stall cap for this event (draft/active reservations + live allocations)
  select count(*) into v_existing_count
  from (
    select 1 from public.stall_reservations
      where user_id = v_uid and event_id = v_event_id and status = 'active' and expires_at > now()
    union all
    select 1 from public.stall_allocations
      where user_id = v_uid and event_id = v_event_id and status not in ('cancelled','completed')
  ) x;

  if not v_allow_multi and v_existing_count >= 1 then
    raise exception 'MULTIPLE_STALLS_NOT_ALLOWED' using errcode = 'P0001';
  end if;
  if v_existing_count >= v_max_stalls then
    raise exception 'MAX_STALLS_REACHED' using errcode = 'P0001';
  end if;

  -- serialize monopoly checks per (event, category) so two simultaneous
  -- attempts on DIFFERENT stalls in the same monopoly category can't both pass
  if p_category_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(v_event_id::text || ':' || p_category_id::text, 0));
    if v_monopoly = 'monopoly' then
      perform public.assert_monopoly_available(v_event_id, p_category_id);
    end if;
  end if;

  insert into public.stall_reservations (event_id, stall_id, user_id, category_id, expires_at)
  values (v_event_id, p_stall_id, v_uid, p_category_id, now() + make_interval(mins => v_minutes))
  returning * into v_reservation;

  update public.stalls set status = 'reserved' where id = p_stall_id;

  perform public.write_audit_log('stall.reserve', 'stalls', p_stall_id, null,
    jsonb_build_object('reservation_id', v_reservation.id, 'expires_at', v_reservation.expires_at));

  return v_reservation;
end;
$$;

grant execute on function public.reserve_stall(uuid, uuid) to authenticated;
grant execute on function public.release_expired_reservations() to authenticated, anon;

-- ---------------------------------------------------------------------
-- cancel_reservation() — user gives up a hold voluntarily
-- ---------------------------------------------------------------------
create or replace function public.cancel_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stall_id uuid;
  v_uid uuid := auth.uid();
begin
  update public.stall_reservations
    set status = 'cancelled'
    where id = p_reservation_id and user_id = v_uid and status = 'active'
    returning stall_id into v_stall_id;

  if v_stall_id is null then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  update public.stalls set status = 'available'
    where id = v_stall_id and status = 'reserved'
      and not exists (
        select 1 from public.stall_allocations a
        where a.stall_id = v_stall_id and a.status not in ('cancelled','completed')
      );

  perform public.write_audit_log('stall.cancel_reservation', 'stall_reservations', p_reservation_id);
end;
$$;

grant execute on function public.cancel_reservation(uuid) to authenticated;
