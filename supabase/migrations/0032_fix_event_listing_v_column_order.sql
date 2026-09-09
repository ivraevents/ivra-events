-- =====================================================================
-- Migration 0032: One-shot fix for the "cannot change name of view
-- column" error hit while running 0029/0030.
--
-- What went wrong (two separate issues, both fixed here): (1) Postgres
-- only allows CREATE OR REPLACE VIEW to keep every existing column in
-- its exact original name/position/type and APPEND new ones at the end
-- — it never allows inserting a new column in the middle of the list,
-- which 0029/0030 both did. (2) once that was fixed, the new
-- available_stalls/total_stalls formulas for unfixed events produced a
-- `numeric` result (because full_stall_unit_ratio is a decimal), while
-- the ORIGINAL column type from 0004 is `bigint` — Postgres rejects a
-- type change on an existing column too, so both branches are now cast
-- to ::bigint to match. Because a multi-statement SQL Editor run is one
-- implicit transaction, each of these errors rolled back everything in
-- that same run — so nothing from either failed attempt was saved.
--
-- This migration is safe to run now no matter what already went through:
-- every ALTER TABLE below uses IF NOT EXISTS, the type creation is
-- guarded, and the function/view use CREATE OR REPLACE. Run this ONE
-- file instead of re-running 0029/0030 by hand — it does everything both
-- of those were meant to do, correctly.
-- =====================================================================

-- From the maps-link / expected-crowd round.
alter table public.events add column if not exists maps_url text;
alter table public.events add column if not exists expected_crowd text;

-- From the fixed/unfixed stall-capacity round.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'event_stall_mode') then
    create type public.event_stall_mode as enum ('fixed', 'unfixed');
  end if;
end $$;

alter table public.events add column if not exists stall_mode public.event_stall_mode not null default 'fixed';
alter table public.events add column if not exists total_stall_capacity int;
alter table public.events add column if not exists full_stall_unit_ratio numeric(6,2) not null default 2
  check (full_stall_unit_ratio > 0);

-- ---------------------------------------------------------------------
-- reserve_open_stall() — the unfixed-mode booking entry point. Capacity-
-- checks and, if room allows, hands back a stall_reservations row
-- exactly like reserve_stall() does directly — because it IS
-- reserve_stall(), called on a stall this function finds-or-mints first.
-- ---------------------------------------------------------------------
create or replace function public.reserve_open_stall(
  p_event_id uuid, p_size_type public.stall_size, p_category_id uuid default null
) returns public.stall_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_stall_type_id uuid;
  v_needed numeric;
  v_consumed numeric;
  v_remaining numeric;
  v_stall_id uuid;
  v_next_seq int;
  v_stall_number text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_event.stall_mode <> 'unfixed' then
    raise exception 'EVENT_NOT_OPEN_CAPACITY' using errcode = 'P0001';
  end if;

  select id into v_stall_type_id
  from public.stall_types
  where event_id = p_event_id and size_type = p_size_type and monopoly_type = 'non_monopoly'
  limit 1;
  if v_stall_type_id is null then
    raise exception 'STALL_TYPE_NOT_CONFIGURED' using errcode = 'P0001';
  end if;

  v_needed := case when p_size_type = 'full' then v_event.full_stall_unit_ratio else 1 end;

  select coalesce(sum(case when st.size_type = 'full' then v_event.full_stall_unit_ratio else 1 end), 0)
    into v_consumed
  from public.stalls s
  join public.stall_types st on st.id = s.stall_type_id
  where s.event_id = p_event_id and s.status <> 'available';

  v_remaining := coalesce(v_event.total_stall_capacity, 0) - v_consumed;
  if v_remaining < v_needed then
    raise exception 'CAPACITY_UNAVAILABLE' using errcode = 'P0001';
  end if;

  select id into v_stall_id
  from public.stalls
  where event_id = p_event_id and stall_type_id = v_stall_type_id and status = 'available'
  limit 1
  for update skip locked;

  if v_stall_id is null then
    select count(*) + 1 into v_next_seq
    from public.stalls where event_id = p_event_id and stall_type_id = v_stall_type_id;
    v_stall_number := (case when p_size_type = 'full' then 'F-' else 'H-' end) || v_next_seq;

    insert into public.stalls (event_id, stall_type_id, stall_number, status)
    values (p_event_id, v_stall_type_id, v_stall_number, 'available')
    returning id into v_stall_id;
  end if;

  return public.reserve_stall(v_stall_id, p_category_id);
end;
$$;

grant execute on function public.reserve_open_stall(uuid, public.stall_size, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- event_listing_v — rebuilt with the original 18 columns (from 0004)
-- kept in their exact original name/order, and every column added since
-- appended after them, in the order it was introduced. This is the
-- shape that avoids the "cannot change name of view column" error.
-- ---------------------------------------------------------------------
create or replace view public.event_listing_v as
select
  e.id, e.name, e.slug, e.description, e.banner_url, e.venue, e.address, e.city,
  e.event_date, e.end_date, e.start_time, e.end_time, e.status,
  e.registration_start_at, e.registration_end_at,
  case
    when e.stall_mode = 'unfixed' then coalesce(e.total_stall_capacity, 0)::bigint
    else count(s.id)
  end as total_stalls,
  case
    when e.stall_mode = 'unfixed' then
      greatest(
        coalesce(e.total_stall_capacity, 0) - coalesce(sum(
          case when s.status <> 'available' then
            case when st.size_type = 'full' then e.full_stall_unit_ratio else 1 end
          else 0 end
        ), 0),
        0
      )::bigint
    else count(s.id) filter (where s.status = 'available')
  end as available_stalls,
  (select min(price_paise) from public.stall_types where event_id = e.id) as starting_price_paise,
  e.maps_url, e.expected_crowd,
  e.stall_mode, e.total_stall_capacity, e.full_stall_unit_ratio,
  (select price_paise from public.stall_types
     where event_id = e.id and size_type = 'half' order by price_paise limit 1) as half_stall_price_paise,
  (select price_paise from public.stall_types
     where event_id = e.id and size_type = 'full' order by price_paise limit 1) as full_stall_price_paise
from public.events e
left join public.stalls s on s.event_id = e.id
left join public.stall_types st on st.id = s.stall_type_id
group by e.id;
