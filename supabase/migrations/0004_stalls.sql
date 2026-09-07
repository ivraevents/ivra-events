-- =====================================================================
-- Migration 0004: Stall Types + Stall Inventory
-- Size (half/full) and Monopoly (monopoly/non_monopoly) are independent
-- attributes — never hardcode the 4 combinations as separate types.
-- =====================================================================

create type public.stall_size as enum ('half', 'full');
create type public.stall_monopoly as enum ('monopoly', 'non_monopoly');
create type public.stall_status as enum ('available', 'reserved', 'confirmed', 'occupied', 'blocked');
create type public.advance_kind as enum ('fixed', 'percentage', 'full');

-- ---------------------------------------------------------------------
-- stall_types — per-event pricing/dimension template for a size x monopoly
-- combination. Admin configures dimensions and price per event; nothing
-- is hardcoded across events.
-- ---------------------------------------------------------------------
create table public.stall_types (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events(id) on delete cascade,
  size_type         public.stall_size not null,
  monopoly_type     public.stall_monopoly not null,
  label             text,                          -- e.g. "Half - Monopoly" (optional display override)

  width_ft          numeric(6,2),
  length_ft         numeric(6,2),

  price_paise       bigint not null check (price_paise >= 0),

  advance_kind      public.advance_kind not null default 'percentage',
  advance_value     numeric(10,2) not null default 20,  -- % if 'percentage', paise if 'fixed', ignored if 'full'

  is_negotiable     boolean not null default false,
  min_price_paise   bigint,                         -- floor for negotiation
  max_discount_pct  numeric(5,2),                    -- ceiling for negotiation/discount stacking

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (event_id, size_type, monopoly_type)
);

create trigger trg_stall_types_updated_at
  before update on public.stall_types
  for each row execute function public.set_updated_at();

-- Append-only price change log (satisfies "historical bookings must
-- preserve original price" — bookings snapshot price at allocation time,
-- this table just lets admins/audits see how list price moved over time)
create table public.stall_price_history (
  id              uuid primary key default gen_random_uuid(),
  stall_type_id   uuid not null references public.stall_types(id) on delete cascade,
  old_price_paise bigint,
  new_price_paise bigint not null,
  changed_by      uuid references public.profiles(id),
  changed_at      timestamptz not null default now()
);

create or replace function public.log_stall_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'UPDATE' and new.price_paise is distinct from old.price_paise) then
    insert into public.stall_price_history (stall_type_id, old_price_paise, new_price_paise, changed_by)
    values (new.id, old.price_paise, new.price_paise, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_stall_types_price_history
  after update on public.stall_types
  for each row execute function public.log_stall_price_change();

-- ---------------------------------------------------------------------
-- stalls — individual bookable units on the map
-- ---------------------------------------------------------------------
create table public.stalls (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events(id) on delete cascade,
  stall_type_id     uuid not null references public.stall_types(id) on delete restrict,
  stall_number      text not null,

  -- optional admin pre-assignment of a category zone; null = open to any
  -- category the vendor registers under (subject to monopoly rules)
  preset_category_id uuid references public.categories(id),

  status            public.stall_status not null default 'available',

  is_negotiable_override boolean,              -- null = inherit from stall_type
  price_override_paise   bigint,               -- null = inherit from stall_type

  -- map layout
  map_x       numeric(8,2) not null default 0,
  map_y       numeric(8,2) not null default 0,
  map_w       numeric(8,2) not null default 1,
  map_h       numeric(8,2) not null default 1,
  map_rotation numeric(5,2) not null default 0,

  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (event_id, stall_number)
);

create index stalls_event_status_idx on public.stalls (event_id, status);

create trigger trg_stalls_updated_at
  before update on public.stalls
  for each row execute function public.set_updated_at();

-- Effective price/negotiability helpers (stall override > stall_type default)
create or replace function public.stall_effective_price(p_stall_id uuid)
returns bigint
language sql
stable
as $$
  select coalesce(s.price_override_paise, st.price_paise)
  from public.stalls s join public.stall_types st on st.id = s.stall_type_id
  where s.id = p_stall_id;
$$;

create or replace function public.stall_is_negotiable(p_stall_id uuid)
returns boolean
language sql
stable
as $$
  select coalesce(s.is_negotiable_override, st.is_negotiable)
  from public.stalls s join public.stall_types st on st.id = s.stall_type_id
  where s.id = p_stall_id;
$$;

-- ---------------------------------------------------------------------
-- Public event listing view — used by the "Upcoming Flea Markets" screen
-- ---------------------------------------------------------------------
create or replace view public.event_listing_v as
select
  e.id, e.name, e.slug, e.description, e.banner_url, e.venue, e.address, e.city,
  e.event_date, e.end_date, e.start_time, e.end_time, e.status,
  e.registration_start_at, e.registration_end_at,
  count(s.id) as total_stalls,
  count(s.id) filter (where s.status = 'available') as available_stalls,
  min(public.stall_effective_price(s.id)) as starting_price_paise
from public.events e
left join public.stalls s on s.event_id = e.id
group by e.id;
