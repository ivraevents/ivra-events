-- ===================================================================
-- Migration: 0001_extensions_and_helpers.sql
-- ===================================================================
-- =====================================================================
-- IVRA EVENTS — Flea Market Management System
-- Migration 0001: Extensions + generic helper functions
-- =====================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "citext";        -- case-insensitive email
create extension if not exists "pg_trgm";       -- search

-- ---------------------------------------------------------------------
-- updated_at trigger helper — attach to any table with an updated_at col
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- current_user_id() — wraps auth.uid() so functions are testable/mockable
-- ---------------------------------------------------------------------
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

-- ---------------------------------------------------------------------
-- has_role(role_key) — checks the many-to-many user_roles table
-- SECURITY DEFINER so RLS on user_roles never causes recursive checks
-- ---------------------------------------------------------------------
-- (created after user_roles table exists — see 0002)


-- ===================================================================
-- Migration: 0002_core_identity.sql
-- ===================================================================
-- =====================================================================
-- Migration 0002: Profiles, Roles, User-Roles, Categories
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles — one row per auth.users, created by trigger on signup
-- ---------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text,
  mobile            citext,
  email             citext,
  avatar_url        text,
  profile_complete  boolean not null default false,
  is_suspended      boolean not null default false,
  suspended_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index profiles_mobile_key on public.profiles (mobile) where mobile is not null;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user is created
-- (covers both Google OAuth and Email OTP sign-ins/sign-ups)
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, mobile)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    new.phone
  )
  on conflict (id) do update
    set email = excluded.email,
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- roles — fixed catalogue, seeded below
-- ---------------------------------------------------------------------
create table public.roles (
  key         text primary key,               -- 'user' | 'vendor' | 'canopy_provider' | 'game_provider' | 'admin' | 'support_manager' | 'support_agent'
  label       text not null,
  description text
);

insert into public.roles (key, label, description) values
  ('user',             'User',              'Default role for every signed-in account'),
  ('vendor',           'Vendor / Stall Provider', 'Can book stalls at events'),
  ('canopy_provider',  'Canopy Provider',   'Provides canopies/tents for events'),
  ('game_provider',    'Game / Entertainment Provider', 'Provides games or entertainment at events'),
  ('admin',            'Administrator',     'Full system access'),
  ('support_manager',  'Support Manager',   'Manages support staff and escalations'),
  ('support_agent',    'Support Agent',     'Handles support tickets; no financial/document access');

-- ---------------------------------------------------------------------
-- user_roles — many-to-many
-- ---------------------------------------------------------------------
create table public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role_key    text not null references public.roles(key) on delete restrict,
  granted_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  unique (user_id, role_key)
);

-- Every new user gets the base 'user' role automatically
create or replace function public.grant_default_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role_key)
  values (new.id, 'user')
  on conflict do nothing;
  return new;
end;
$$;

create trigger trg_profiles_default_role
  after insert on public.profiles
  for each row execute function public.grant_default_role();

-- ---------------------------------------------------------------------
-- has_role() / is_admin() / has_any_role() — SECURITY DEFINER to avoid
-- RLS recursion when policies on other tables check role membership
-- ---------------------------------------------------------------------
create or replace function public.has_role(p_role text, p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = p_user and ur.role_key = p_role
  );
$$;

create or replace function public.has_any_role(p_roles text[], p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = p_user and ur.role_key = any(p_roles)
  );
$$;

create or replace function public.is_admin(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin', p_user);
$$;

create or replace function public.is_support_staff(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array['admin','support_manager','support_agent'], p_user);
$$;

-- ---------------------------------------------------------------------
-- categories — admin-configurable, used by vendors / monopoly / discounts
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

insert into public.categories (name, slug, sort_order) values
  ('Fashion', 'fashion', 1),
  ('Clothing', 'clothing', 2),
  ('Jewellery', 'jewellery', 3),
  ('Food', 'food', 4),
  ('Bakery', 'bakery', 5),
  ('Toys', 'toys', 6),
  ('Handmade Products', 'handmade-products', 7),
  ('NGO', 'ngo', 8),
  ('Promotional', 'promotional', 9),
  ('Home & Lifestyle', 'home-lifestyle', 10),
  ('Art & Craft', 'art-craft', 11),
  ('Beauty', 'beauty', 12),
  ('Other', 'other', 99);


-- ===================================================================
-- Migration: 0003_events.sql
-- ===================================================================
-- =====================================================================
-- Migration 0003: Events
-- =====================================================================

create type public.event_status as enum (
  'draft', 'upcoming', 'registration_open', 'registration_closed',
  'ongoing', 'completed', 'cancelled'
);

create table public.events (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  slug                  text not null unique,
  description           text,
  banner_url            text,
  venue                 text,
  address               text,
  city                  text,
  event_date            date not null,
  end_date              date,
  start_time            time,
  end_time              time,
  registration_start_at timestamptz,
  registration_end_at   timestamptz,
  status                public.event_status not null default 'draft',
  terms_and_conditions  text,

  -- booking rules (server-enforced everywhere they matter)
  allow_multiple_stalls   boolean not null default true,
  max_stalls_per_user     int not null default 5,
  reservation_minutes     int not null default 10,          -- stall hold duration
  application_fee_paise   bigint not null default 9900,      -- ₹99 default, stored in paise
  negotiation_enabled     boolean not null default true,

  duplicated_from_event_id uuid references public.events(id),

  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index events_status_idx on public.events (status);
create index events_date_idx on public.events (event_date);

create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- event_categories — which product categories are permitted at an event,
-- and whether that category is a monopoly category for this event
-- ---------------------------------------------------------------------
create table public.event_categories (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete restrict,
  monopoly_scope text not null default 'event_category'
    check (monopoly_scope in ('event_category', 'event_wide', 'none')),
  -- 'event_category' = only one monopoly booking per category per event (typical)
  -- 'event_wide'      = booking this category as monopoly blocks ALL other
  --                      monopoly bookings for the event (rare, admin opt-in)
  -- 'none'            = monopoly not offered for this category at this event
  created_at    timestamptz not null default now(),
  unique (event_id, category_id)
);

-- ---------------------------------------------------------------------
-- Convenience view: public event listing with computed stall counts
-- (created after stalls table exists — see 0004 bottom)
-- ---------------------------------------------------------------------


-- ===================================================================
-- Migration: 0004_stalls.sql
-- ===================================================================
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


-- ===================================================================
-- Migration: 0005_reservations_and_allocations.sql
-- ===================================================================
-- =====================================================================
-- Migration 0005: Stall Reservations (temporary holds) + Allocations
-- (confirmed/in-progress bookings)
-- =====================================================================

create type public.reservation_status as enum ('active', 'converted', 'expired', 'cancelled');

create table public.stall_reservations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  stall_id      uuid not null references public.stalls(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  category_id   uuid references public.categories(id),   -- category the vendor intends to book under
  status        public.reservation_status not null default 'active',
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now()
);

create index stall_reservations_active_idx
  on public.stall_reservations (stall_id)
  where status = 'active';

create index stall_reservations_expiry_idx
  on public.stall_reservations (expires_at)
  where status = 'active';

-- Only one ACTIVE reservation per stall at a time (belt-and-braces on top
-- of the row-locking logic in the reserve_stall() function)
create unique index stall_reservations_one_active_per_stall
  on public.stall_reservations (stall_id)
  where status = 'active';

create type public.booking_status as enum (
  'draft', 'reserved', 'payment_pending', 'pending_approval',
  'confirmed', 'balance_pending', 'fully_paid', 'cancelled', 'completed'
);

-- ---------------------------------------------------------------------
-- stall_allocations — the booking record itself. Created when a
-- reservation is converted (registration details submitted). Preserves
-- original price forever, independent of later stall_type price changes.
-- ---------------------------------------------------------------------
create table public.stall_allocations (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  stall_id            uuid not null references public.stalls(id) on delete restrict,
  reservation_id      uuid references public.stall_reservations(id),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  registration_id     uuid,                                -- fk added in 0006 after registrations exists
  category_id         uuid references public.categories(id),

  size_type           public.stall_size not null,
  monopoly_type       public.stall_monopoly not null,

  original_price_paise    bigint not null,   -- snapshot of stall's list price at booking time
  negotiated_price_paise  bigint,            -- set if a negotiation was accepted
  discount_paise          bigint not null default 0,
  coupon_discount_paise   bigint not null default 0,
  final_price_paise       bigint not null,   -- original - discount - coupon (or negotiated - discount/coupon)

  required_advance_paise  bigint not null default 0,
  application_fee_applied_paise bigint not null default 0,  -- ₹99 credited against this booking

  status              public.booking_status not null default 'draft',

  confirmed_at        timestamptz,
  cancelled_at        timestamptz,
  cancelled_reason     text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index stall_allocations_event_idx on public.stall_allocations (event_id, status);
create index stall_allocations_user_idx on public.stall_allocations (user_id);

create trigger trg_stall_allocations_updated_at
  before update on public.stall_allocations
  for each row execute function public.set_updated_at();

-- At most one non-terminal allocation per stall (cancelled/completed excluded)
create unique index stall_allocations_one_live_per_stall
  on public.stall_allocations (stall_id)
  where status not in ('cancelled', 'completed');


-- ===================================================================
-- Migration: 0006_registrations.sql
-- ===================================================================
-- =====================================================================
-- Migration 0006: Registrations (Vendor / Canopy / Game providers)
-- =====================================================================

create type public.registration_type as enum ('vendor', 'canopy', 'game');
create type public.registration_status as enum (
  'draft', 'submitted', 'under_review', 'approved', 'rejected', 'changes_requested'
);

-- ---------------------------------------------------------------------
-- registrations — common header, one per (user, event, type[, stall])
-- ---------------------------------------------------------------------
create table public.registrations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  event_id        uuid not null references public.events(id) on delete cascade,
  type            public.registration_type not null,
  status          public.registration_status not null default 'draft',

  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  rejection_reason text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index registrations_user_idx on public.registrations (user_id);
create index registrations_event_idx on public.registrations (event_id, type, status);

create trigger trg_registrations_updated_at
  before update on public.registrations
  for each row execute function public.set_updated_at();

-- now that registrations exists, wire up the FK from stall_allocations
alter table public.stall_allocations
  add constraint stall_allocations_registration_fk
  foreign key (registration_id) references public.registrations(id) on delete set null;

-- ---------------------------------------------------------------------
-- vendor_registrations — 1:1 detail extension
-- ---------------------------------------------------------------------
create table public.vendor_registrations (
  registration_id   uuid primary key references public.registrations(id) on delete cascade,
  full_name         text not null,
  mobile            citext not null,
  email             citext not null,
  pan_number        citext,
  business_name     text,
  business_details  text,
  address           text,
  city              text,
  state             text,
  pincode           text,
  gst_number        citext,
  product_info      text,
  category_id       uuid references public.categories(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger trg_vendor_registrations_updated_at
  before update on public.vendor_registrations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- canopy_registrations
-- ---------------------------------------------------------------------
create table public.canopy_registrations (
  registration_id   uuid primary key references public.registrations(id) on delete cascade,
  name              text not null,
  mobile            citext not null,
  email             citext not null,
  business          text,
  canopy_type       text,
  width_ft          numeric(6,2),
  length_ft         numeric(6,2),
  capacity          int,
  pricing_notes     text,
  experience_years  int,
  description       text,
  quoted_price_paise bigint,
  approved_price_paise bigint,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger trg_canopy_registrations_updated_at
  before update on public.canopy_registrations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- game_registrations
-- ---------------------------------------------------------------------
create table public.game_registrations (
  registration_id   uuid primary key references public.registrations(id) on delete cascade,
  name              text not null,
  mobile            citext not null,
  email             citext not null,
  business          text,
  activity_type     text,
  description       text,
  space_required    text,
  equipment         text,
  safety_info       text,
  quoted_price_paise bigint,
  approved_price_paise bigint,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger trg_game_registrations_updated_at
  before update on public.game_registrations
  for each row execute function public.set_updated_at();


-- ===================================================================
-- Migration: 0007_documents.sql
-- ===================================================================
-- =====================================================================
-- Migration 0007: Documents + Versioning
-- Files themselves live in the private 'private-documents' storage
-- bucket (see 0021) — this table only stores metadata + storage paths.
-- =====================================================================

create type public.document_kind as enum ('aadhaar_front', 'aadhaar_back', 'pan', 'other');
create type public.document_status as enum ('pending', 'approved', 'rejected', 'reupload_requested');

create table public.documents (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  registration_id   uuid references public.registrations(id) on delete cascade,
  kind              public.document_kind not null,
  current_version   int not null default 1,
  status            public.document_status not null default 'pending',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index documents_user_idx on public.documents (user_id);
create index documents_registration_idx on public.documents (registration_id);

create trigger trg_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- document_versions — every upload/re-upload creates a new immutable row
-- ---------------------------------------------------------------------
create type public.document_rejection_reason as enum (
  'aadhaar_front_unclear', 'aadhaar_back_unclear', 'wrong_document',
  'document_mismatch', 'appears_altered', 'other'
);

create table public.document_versions (
  id                uuid primary key default gen_random_uuid(),
  document_id       uuid not null references public.documents(id) on delete cascade,
  version           int not null,
  storage_bucket    text not null default 'private-documents',
  storage_path      text not null,          -- e.g. {user_id}/{document_id}/v{n}-{safe_filename}
  original_filename text not null,
  mime_type         text not null,
  file_size_bytes   bigint not null,

  status            public.document_status not null default 'pending',
  reviewed_by       uuid references public.profiles(id),
  reviewed_at       timestamptz,
  rejection_reason  public.document_rejection_reason,
  rejection_note    text,

  uploaded_at       timestamptz not null default now(),
  unique (document_id, version)
);

create index document_versions_document_idx on public.document_versions (document_id);

-- Keep documents.current_version / status in sync with the latest version row
create or replace function public.sync_document_from_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.documents
    set current_version = new.version,
        status = new.status
    where id = new.document_id;
  return new;
end;
$$;

create trigger trg_document_versions_sync
  after insert or update on public.document_versions
  for each row execute function public.sync_document_from_version();


-- ===================================================================
-- Migration: 0008_discounts.sql
-- ===================================================================
-- =====================================================================
-- Migration 0008: Discounts (admin-configured, no code required)
-- =====================================================================

create type public.discount_kind as enum ('percentage', 'fixed');

create table public.discounts (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  description       text,
  kind              public.discount_kind not null,
  value             numeric(10,2) not null,   -- % if percentage, paise if fixed

  -- scope (all nullable = unrestricted on that dimension)
  event_id          uuid references public.events(id) on delete cascade,
  category_id       uuid references public.categories(id),
  size_type         public.stall_size,
  monopoly_type     public.stall_monopoly,
  stall_id          uuid references public.stalls(id),
  user_id           uuid references public.profiles(id),

  min_booking_amount_paise bigint,
  min_stall_count          int,

  starts_at         timestamptz,
  ends_at           timestamptz,

  usage_limit       int,                 -- total redemptions across all users
  per_user_limit    int default 1,
  max_discount_paise bigint,             -- cap for percentage discounts

  is_stackable      boolean not null default false,
  is_active         boolean not null default true,

  duplicated_from_id uuid references public.discounts(id),

  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index discounts_event_idx on public.discounts (event_id) where is_active;

create trigger trg_discounts_updated_at
  before update on public.discounts
  for each row execute function public.set_updated_at();

create table public.discount_usages (
  id            uuid primary key default gen_random_uuid(),
  discount_id   uuid not null references public.discounts(id) on delete cascade,
  user_id       uuid not null references public.profiles(id),
  allocation_id uuid references public.stall_allocations(id),
  amount_paise  bigint not null,
  created_at    timestamptz not null default now()
);

create index discount_usages_discount_idx on public.discount_usages (discount_id);
create index discount_usages_user_idx on public.discount_usages (user_id);


-- ===================================================================
-- Migration: 0009_coupons.sql
-- ===================================================================
-- =====================================================================
-- Migration 0009: Coupons (code-based)
-- =====================================================================

create table public.coupons (
  id                uuid primary key default gen_random_uuid(),
  code              citext not null unique,
  description       text,
  kind              public.discount_kind not null,
  value             numeric(10,2) not null,

  event_id          uuid references public.events(id) on delete cascade,
  category_id       uuid references public.categories(id),
  stall_id          uuid references public.stalls(id),

  min_amount_paise  bigint,
  max_discount_paise bigint,

  starts_at         timestamptz,
  ends_at           timestamptz,

  usage_limit       int,
  per_user_limit    int not null default 1,

  is_stackable_with_discounts boolean not null default true,
  is_active         boolean not null default true,
  is_draft          boolean not null default false,   -- duplicates start as draft

  duplicated_from_id uuid references public.coupons(id),

  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_coupons_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- coupon_usages — preserved even if the booking later changes/cancels
-- ---------------------------------------------------------------------
create type public.coupon_usage_status as enum ('applied', 'reversed');

create table public.coupon_usages (
  id            uuid primary key default gen_random_uuid(),
  coupon_id     uuid not null references public.coupons(id) on delete restrict,
  user_id       uuid not null references public.profiles(id),
  allocation_id uuid references public.stall_allocations(id),
  discount_paise bigint not null,
  status        public.coupon_usage_status not null default 'applied',
  created_at    timestamptz not null default now()
);

create index coupon_usages_coupon_idx on public.coupon_usages (coupon_id);
create index coupon_usages_user_idx on public.coupon_usages (user_id);


-- ===================================================================
-- Migration: 0010_negotiations.sql
-- ===================================================================
-- =====================================================================
-- Migration 0010: Negotiation requests + offer history (fully audited)
-- =====================================================================

create type public.negotiation_status as enum (
  'pending', 'countered', 'approved', 'rejected', 'expired', 'withdrawn'
);

create table public.negotiation_requests (
  id                uuid primary key default gen_random_uuid(),
  allocation_id     uuid not null references public.stall_allocations(id) on delete cascade,
  stall_id          uuid not null references public.stalls(id),
  user_id           uuid not null references public.profiles(id),

  original_price_paise bigint not null,
  status            public.negotiation_status not null default 'pending',
  final_price_paise bigint,             -- set once approved/settled

  max_counter_offers int not null default 3,
  counter_count      int not null default 0,
  expires_at         timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index negotiation_requests_allocation_idx on public.negotiation_requests (allocation_id);

-- Only one open negotiation per allocation at a time
create unique index negotiation_requests_one_open_per_allocation
  on public.negotiation_requests (allocation_id)
  where status in ('pending', 'countered');

create trigger trg_negotiation_requests_updated_at
  before update on public.negotiation_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- negotiation_offers — immutable audit trail of every offer/counter
-- ---------------------------------------------------------------------
create type public.negotiation_actor as enum ('user', 'admin');
create type public.negotiation_offer_kind as enum (
  'user_offer', 'admin_counter', 'user_counter', 'admin_approve',
  'admin_reject', 'user_accept', 'user_reject', 'expired'
);

create table public.negotiation_offers (
  id              uuid primary key default gen_random_uuid(),
  negotiation_id  uuid not null references public.negotiation_requests(id) on delete cascade,
  actor           public.negotiation_actor not null,
  actor_id        uuid references public.profiles(id),
  kind            public.negotiation_offer_kind not null,
  price_paise     bigint,             -- null for approve/reject/accept-of-previous actions
  message         text,
  created_at      timestamptz not null default now()
);

create index negotiation_offers_negotiation_idx on public.negotiation_offers (negotiation_id, created_at);

-- ---------------------------------------------------------------------
-- Admin-configurable negotiation rules (global defaults; per-event
-- overrides live on events.negotiation_enabled + stall_types.is_negotiable)
-- ---------------------------------------------------------------------
create table public.negotiation_rules (
  id                    uuid primary key default gen_random_uuid(),
  event_id              uuid references public.events(id) on delete cascade,  -- null = global default
  min_price_paise       bigint,
  max_discount_pct      numeric(5,2),
  max_counter_offers    int not null default 3,
  offer_expiry_hours    int not null default 24,
  monopoly_negotiable   boolean not null default false,
  excluded_category_ids uuid[] default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (event_id)
);

create trigger trg_negotiation_rules_updated_at
  before update on public.negotiation_rules
  for each row execute function public.set_updated_at();


-- ===================================================================
-- Migration: 0011_payments_ledger.sql
-- ===================================================================
-- =====================================================================
-- Migration 0011: Payment Ledger
-- Every rupee is recorded as an immutable payment/adjustment/refund row.
-- Nothing is ever overwritten — corrections are new rows.
-- =====================================================================

create type public.payment_purpose as enum (
  'application_fee', 'stall_advance', 'stall_balance', 'stall_full',
  'canopy_payment', 'game_payment', 'additional_advance'
);
create type public.payment_method as enum ('upi', 'bank_transfer', 'cash', 'card', 'other');
create type public.payment_status as enum ('initiated', 'pending_verification', 'verified', 'failed', 'reversed');

create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id),
  event_id          uuid references public.events(id),
  allocation_id     uuid references public.stall_allocations(id),
  registration_id   uuid references public.registrations(id),   -- for canopy/game payments

  purpose           public.payment_purpose not null,
  amount_paise      bigint not null check (amount_paise > 0),
  method            public.payment_method not null default 'upi',
  status            public.payment_status not null default 'pending_verification',

  utr_reference     text,
  gateway_reference text,
  proof_storage_path text,

  verified_by       uuid references public.profiles(id),
  verified_at       timestamptz,

  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index payments_user_idx on public.payments (user_id);
create index payments_allocation_idx on public.payments (allocation_id);

create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- payment_allocations — how a verified payment is applied against
-- charges (application fee credit, stall advance, balance, etc). Lets
-- the ₹99 application fee be *adjusted* against a stall booking without
-- ever mutating the original ₹99 payment row.
-- ---------------------------------------------------------------------
create table public.payment_allocations (
  id                uuid primary key default gen_random_uuid(),
  payment_id        uuid not null references public.payments(id) on delete cascade,
  allocation_id     uuid references public.stall_allocations(id),
  amount_paise      bigint not null check (amount_paise > 0),
  note              text,
  created_at        timestamptz not null default now()
);

create index payment_allocations_payment_idx on public.payment_allocations (payment_id);
create index payment_allocations_allocation_idx on public.payment_allocations (allocation_id);

-- ---------------------------------------------------------------------
-- adjustments — non-cash ledger entries (e.g. crediting the ₹99
-- application advance against a stall's required advance)
-- ---------------------------------------------------------------------
create type public.adjustment_kind as enum ('credit', 'debit');

create table public.adjustments (
  id                uuid primary key default gen_random_uuid(),
  allocation_id     uuid not null references public.stall_allocations(id) on delete cascade,
  kind              public.adjustment_kind not null,
  amount_paise      bigint not null check (amount_paise > 0),
  reason            text not null,
  source_payment_id uuid references public.payments(id),
  created_by        uuid references public.profiles(id),
  created_at        timestamptz not null default now()
);

create index adjustments_allocation_idx on public.adjustments (allocation_id);

-- ---------------------------------------------------------------------
-- refunds
-- ---------------------------------------------------------------------
create type public.refund_status as enum ('requested', 'approved', 'processed', 'rejected');

create table public.refunds (
  id                uuid primary key default gen_random_uuid(),
  payment_id        uuid not null references public.payments(id),
  allocation_id     uuid references public.stall_allocations(id),
  amount_paise      bigint not null check (amount_paise > 0),
  reason            text,
  status            public.refund_status not null default 'requested',
  processed_by      uuid references public.profiles(id),
  processed_at      timestamptz,
  reference         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger trg_refunds_updated_at
  before update on public.refunds
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Ledger summary view per allocation — paid / balance, computed live
-- from verified payments + adjustments + refunds (never a stored total)
-- ---------------------------------------------------------------------
create or replace view public.allocation_ledger_v as
select
  a.id as allocation_id,
  a.final_price_paise,
  a.required_advance_paise,
  coalesce(sum(pa.amount_paise) filter (where p.status = 'verified'), 0) as paid_via_payments_paise,
  coalesce((select sum(adj.amount_paise) from public.adjustments adj
            where adj.allocation_id = a.id and adj.kind = 'credit'), 0)
    - coalesce((select sum(adj.amount_paise) from public.adjustments adj
            where adj.allocation_id = a.id and adj.kind = 'debit'), 0) as net_adjustments_paise,
  coalesce((select sum(r.amount_paise) from public.refunds r
            where r.allocation_id = a.id and r.status = 'processed'), 0) as refunded_paise
from public.stall_allocations a
left join public.payment_allocations pa on pa.allocation_id = a.id
left join public.payments p on p.id = pa.payment_id
group by a.id;


-- ===================================================================
-- Migration: 0012_invoices.sql
-- ===================================================================
-- =====================================================================
-- Migration 0012: Invoices
-- =====================================================================

create type public.invoice_type as enum ('gst', 'non_gst');
create type public.invoice_status as enum ('generated', 'sent', 'cancelled');

create table public.invoice_sequences (
  prefix        text primary key,
  next_number   bigint not null default 1
);

insert into public.invoice_sequences (prefix, next_number) values ('IVRA', 1);

create table public.invoices (
  id                uuid primary key default gen_random_uuid(),
  invoice_number    text not null unique,
  invoice_type      public.invoice_type not null default 'non_gst',
  status            public.invoice_status not null default 'generated',

  user_id           uuid not null references public.profiles(id),
  event_id          uuid references public.events(id),
  allocation_id     uuid references public.stall_allocations(id),
  payment_id        uuid references public.payments(id),
  registration_id   uuid references public.registrations(id),

  business_name     text not null,
  business_address  text,
  gstin             text,
  pan               text,

  subtotal_paise    bigint not null default 0,
  tax_paise         bigint not null default 0,
  total_paise       bigint not null default 0,

  pdf_storage_path  text,

  generated_by      uuid references public.profiles(id),
  created_at        timestamptz not null default now()
);

create index invoices_user_idx on public.invoices (user_id);
create index invoices_allocation_idx on public.invoices (allocation_id);

create table public.invoice_items (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references public.invoices(id) on delete cascade,
  description   text not null,
  quantity      int not null default 1,
  unit_price_paise bigint not null,
  tax_rate_pct  numeric(5,2) not null default 0,
  amount_paise  bigint not null
);

create index invoice_items_invoice_idx on public.invoice_items (invoice_id);

-- ---------------------------------------------------------------------
-- next_invoice_number() — atomic, gap-free per prefix
-- ---------------------------------------------------------------------
create or replace function public.next_invoice_number(p_prefix text default 'IVRA')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq bigint;
  v_year text := to_char(now(), 'YYYY');
begin
  insert into public.invoice_sequences (prefix, next_number)
  values (p_prefix, 1)
  on conflict (prefix) do nothing;

  update public.invoice_sequences
    set next_number = next_number + 1
    where prefix = p_prefix
    returning next_number - 1 into v_seq;

  return p_prefix || '/' || v_year || '/' || lpad(v_seq::text, 5, '0');
end;
$$;


-- ===================================================================
-- Migration: 0013_support.sql
-- ===================================================================
-- =====================================================================
-- Migration 0013: Support / Helpdesk
-- =====================================================================

create type public.ticket_category as enum (
  'booking', 'stall', 'payment', 'invoice', 'document', 'account', 'coupon', 'event', 'other'
);
create type public.ticket_status as enum (
  'open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'
);
create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');

create table public.support_tickets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  subject       text not null,
  category      public.ticket_category not null default 'other',
  status        public.ticket_status not null default 'open',
  priority      public.ticket_priority not null default 'normal',

  event_id      uuid references public.events(id),
  allocation_id uuid references public.stall_allocations(id),
  stall_id      uuid references public.stalls(id),

  assigned_to   uuid references public.profiles(id),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index support_tickets_user_idx on public.support_tickets (user_id);
create index support_tickets_status_idx on public.support_tickets (status);

create trigger trg_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id),
  is_staff    boolean not null default false,
  message     text not null,
  created_at  timestamptz not null default now()
);

create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

create table public.support_attachments (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid references public.support_messages(id) on delete cascade,
  ticket_id     uuid not null references public.support_tickets(id) on delete cascade,
  uploaded_by   uuid not null references public.profiles(id),
  storage_bucket text not null default 'support-attachments',
  storage_path  text not null,
  original_filename text not null,
  mime_type     text not null,
  file_size_bytes bigint not null,
  created_at    timestamptz not null default now()
);

create index support_attachments_ticket_idx on public.support_attachments (ticket_id);

-- First message auto-bumps a ticket back to "open"/"waiting_for_user"
create or replace function public.touch_ticket_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_tickets
    set status = case when new.is_staff then 'waiting_for_user'::public.ticket_status
                       else 'open'::public.ticket_status end,
        updated_at = now()
    where id = new.ticket_id
      and status not in ('closed');
  return new;
end;
$$;

create trigger trg_support_messages_touch_ticket
  after insert on public.support_messages
  for each row execute function public.touch_ticket_on_message();


-- ===================================================================
-- Migration: 0014_notifications_audit_settings.sql
-- ===================================================================
-- =====================================================================
-- Migration 0014: In-app Notifications, Audit Logs, System Settings
-- =====================================================================

create type public.notification_type as enum (
  'registration_approved', 'registration_rejected', 'document_reupload_required',
  'document_approved', 'payment_verified', 'stall_reserved', 'stall_reservation_expiring',
  'stall_confirmed', 'negotiation_submitted', 'negotiation_countered',
  'negotiation_approved', 'negotiation_rejected', 'coupon_applied',
  'invoice_generated', 'support_reply', 'support_status_changed', 'general'
);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        public.notification_type not null default 'general',
  title       text not null,
  body        text,
  link_path   text,          -- in-app route to deep-link to, e.g. /bookings/{id}
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index notifications_user_unread_idx on public.notifications (user_id, is_read, created_at desc);

-- ---------------------------------------------------------------------
-- audit_logs — immutable. Insert-only; no update/delete policies at all.
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references public.profiles(id),
  action        text not null,          -- e.g. 'stall.reserve', 'registration.approve'
  entity_type   text not null,          -- e.g. 'stall_allocations'
  entity_id     uuid,
  old_value     jsonb,
  new_value     jsonb,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

create or replace function public.write_audit_log(
  p_action text, p_entity_type text, p_entity_id uuid,
  p_old jsonb default null, p_new jsonb default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_old, p_new);
end;
$$;

-- ---------------------------------------------------------------------
-- system_settings — single-row key/value config, admin-editable
-- ---------------------------------------------------------------------
create table public.system_settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now()
);

insert into public.system_settings (key, value) values
  ('application_fee_paise', '9900'),
  ('default_reservation_minutes', '10'),
  ('default_max_stalls_per_user', '5'),
  ('negotiation_defaults', '{"max_counter_offers": 3, "offer_expiry_hours": 24, "monopoly_negotiable": false}'),
  ('refund_rules', '{"processing_days": 7, "requires_admin_approval": true}'),
  ('upi_details', '{"vpa": "", "payee_name": "", "notes": ""}'),
  ('business_details', '{"legal_name": "Navrathan Jewellers", "gstin": "", "pan": "", "address": ""}'),
  ('invoice_settings', '{"prefix": "IVRA", "default_type": "non_gst", "terms": ""}'),
  ('document_limits', '{"max_file_size_mb": 5, "allowed_types": ["image/jpeg", "image/png", "application/pdf"]}');

create trigger trg_system_settings_updated_at
  before update on public.system_settings
  for each row execute function public.set_updated_at();


-- ===================================================================
-- Migration: 0015_fn_reservation_and_monopoly.sql
-- ===================================================================
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


-- ===================================================================
-- Migration: 0016_fn_pricing_discounts_coupons.sql
-- ===================================================================
-- =====================================================================
-- Migration 0016: Server-side pricing engine, discount matching,
-- coupon validation. Never trust client-supplied discount amounts.
-- =====================================================================

-- ---------------------------------------------------------------------
-- matching_discounts() — every ACTIVE discount whose scope matches this
-- booking context, with its computed rupee amount already capped
-- ---------------------------------------------------------------------
create or replace function public.matching_discounts(
  p_event_id uuid, p_category_id uuid, p_size_type public.stall_size,
  p_monopoly_type public.stall_monopoly, p_stall_id uuid, p_user_id uuid,
  p_amount_paise bigint, p_stall_count int default 1
) returns table (id uuid, amount_paise bigint, is_stackable boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select d.id,
    least(
      case d.kind
        when 'percentage' then floor(p_amount_paise * d.value / 100.0)::bigint
        else d.value::bigint
      end,
      coalesce(d.max_discount_paise, p_amount_paise),
      p_amount_paise
    ) as amount_paise,
    d.is_stackable
  from public.discounts d
  where d.is_active
    and (d.event_id is null or d.event_id = p_event_id)
    and (d.category_id is null or d.category_id = p_category_id)
    and (d.size_type is null or d.size_type = p_size_type)
    and (d.monopoly_type is null or d.monopoly_type = p_monopoly_type)
    and (d.stall_id is null or d.stall_id = p_stall_id)
    and (d.user_id is null or d.user_id = p_user_id)
    and (d.min_booking_amount_paise is null or p_amount_paise >= d.min_booking_amount_paise)
    and (d.min_stall_count is null or p_stall_count >= d.min_stall_count)
    and (d.starts_at is null or d.starts_at <= now())
    and (d.ends_at is null or d.ends_at >= now())
    and (d.usage_limit is null or
         (select count(*) from public.discount_usages du where du.discount_id = d.id) < d.usage_limit)
    and (d.per_user_limit is null or
         (select count(*) from public.discount_usages du
          where du.discount_id = d.id and du.user_id = p_user_id) < d.per_user_limit);
end;
$$;

-- ---------------------------------------------------------------------
-- best_discount_total() — applies stacking rule: all stackable discounts
-- sum together; if any non-stackable discount matches, only the single
-- highest-value candidate (stackable or not) is used instead.
-- ---------------------------------------------------------------------
create or replace function public.best_discount_total(
  p_event_id uuid, p_category_id uuid, p_size_type public.stall_size,
  p_monopoly_type public.stall_monopoly, p_stall_id uuid, p_user_id uuid,
  p_amount_paise bigint, p_stall_count int default 1
) returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_stackable_sum bigint;
  v_best_single bigint;
  v_has_non_stackable boolean;
begin
  select coalesce(sum(amount_paise) filter (where is_stackable), 0),
         coalesce(max(amount_paise), 0),
         bool_or(not is_stackable)
    into v_stackable_sum, v_best_single, v_has_non_stackable
  from public.matching_discounts(p_event_id, p_category_id, p_size_type, p_monopoly_type,
                                   p_stall_id, p_user_id, p_amount_paise, p_stall_count);

  if v_has_non_stackable then
    return least(v_best_single, p_amount_paise);
  end if;
  return least(v_stackable_sum, p_amount_paise);
end;
$$;

-- ---------------------------------------------------------------------
-- validate_coupon() — full server-side validation. Returns a jsonb
-- result; never raises for a "bad coupon", so the UI can show a message.
-- ---------------------------------------------------------------------
create or replace function public.validate_coupon(
  p_code text, p_event_id uuid, p_category_id uuid, p_stall_id uuid,
  p_user_id uuid, p_amount_paise bigint
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.coupons;
  v_discount bigint;
  v_user_uses int;
  v_total_uses int;
begin
  select * into c from public.coupons where code = p_code::citext;

  if c.id is null then
    return jsonb_build_object('valid', false, 'reason', 'Coupon not found');
  end if;
  if not c.is_active or c.is_draft then
    return jsonb_build_object('valid', false, 'reason', 'Coupon is not active');
  end if;
  if c.starts_at is not null and c.starts_at > now() then
    return jsonb_build_object('valid', false, 'reason', 'Coupon is not yet valid');
  end if;
  if c.ends_at is not null and c.ends_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'Coupon has expired');
  end if;
  if c.event_id is not null and c.event_id is distinct from p_event_id then
    return jsonb_build_object('valid', false, 'reason', 'Coupon is not valid for this event');
  end if;
  if c.category_id is not null and c.category_id is distinct from p_category_id then
    return jsonb_build_object('valid', false, 'reason', 'Coupon is not valid for this category');
  end if;
  if c.stall_id is not null and c.stall_id is distinct from p_stall_id then
    return jsonb_build_object('valid', false, 'reason', 'Coupon is not valid for this stall');
  end if;
  if c.min_amount_paise is not null and p_amount_paise < c.min_amount_paise then
    return jsonb_build_object('valid', false, 'reason', 'Booking amount is below the coupon minimum');
  end if;

  select count(*) into v_total_uses from public.coupon_usages
    where coupon_id = c.id and status = 'applied';
  if c.usage_limit is not null and v_total_uses >= c.usage_limit then
    return jsonb_build_object('valid', false, 'reason', 'Coupon usage limit reached');
  end if;

  select count(*) into v_user_uses from public.coupon_usages
    where coupon_id = c.id and user_id = p_user_id and status = 'applied';
  if v_user_uses >= c.per_user_limit then
    return jsonb_build_object('valid', false, 'reason', 'You have already used this coupon');
  end if;

  v_discount := case c.kind
    when 'percentage' then floor(p_amount_paise * c.value / 100.0)::bigint
    else c.value::bigint
  end;
  v_discount := least(v_discount, coalesce(c.max_discount_paise, p_amount_paise), p_amount_paise);

  return jsonb_build_object(
    'valid', true, 'coupon_id', c.id, 'code', c.code,
    'discount_paise', v_discount, 'stackable_with_discounts', c.is_stackable_with_discounts
  );
end;
$$;

grant execute on function public.validate_coupon(text, uuid, uuid, uuid, uuid, bigint) to authenticated;

-- ---------------------------------------------------------------------
-- compute_required_advance() — from the stall_type's advance configuration
-- ---------------------------------------------------------------------
create or replace function public.compute_required_advance(p_stall_id uuid, p_price_paise bigint)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_kind public.advance_kind;
  v_value numeric;
begin
  select st.advance_kind, st.advance_value into v_kind, v_value
  from public.stalls s join public.stall_types st on st.id = s.stall_type_id
  where s.id = p_stall_id;

  return case v_kind
    when 'full' then p_price_paise
    when 'fixed' then least(v_value::bigint, p_price_paise)
    else floor(p_price_paise * v_value / 100.0)::bigint   -- 'percentage'
  end;
end;
$$;

-- ---------------------------------------------------------------------
-- unused_application_fee_credit() — sum of this user's verified ₹99
-- application-fee payments not yet allocated to any booking
-- ---------------------------------------------------------------------
create or replace function public.unused_application_fee_credit(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(p.amount_paise), 0) - coalesce((
    select sum(pa.amount_paise) from public.payment_allocations pa
    join public.payments pp on pp.id = pa.payment_id
    where pp.user_id = p_user_id and pp.purpose = 'application_fee' and pp.status = 'verified'
  ), 0)
  from public.payments p
  where p.user_id = p_user_id and p.purpose = 'application_fee' and p.status = 'verified';
$$;

-- ---------------------------------------------------------------------
-- compute_price_breakdown() — the single source of truth the UI calls
-- to render "Price Breakdown". Pure/read-only: applies no side effects.
-- ---------------------------------------------------------------------
create or replace function public.compute_price_breakdown(
  p_stall_id uuid, p_category_id uuid default null, p_coupon_code text default null,
  p_negotiated_price_paise bigint default null, p_user_id uuid default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(p_user_id, auth.uid());
  v_event_id uuid;
  v_size public.stall_size;
  v_monopoly public.stall_monopoly;
  v_original bigint;
  v_base bigint;
  v_discount bigint;
  v_coupon jsonb := jsonb_build_object('valid', false);
  v_coupon_discount bigint := 0;
  v_advance bigint;
  v_app_credit bigint;
  v_app_applied bigint;
  v_additional_advance bigint;
  v_final bigint;
begin
  select s.event_id, st.size_type, st.monopoly_type, public.stall_effective_price(s.id)
    into v_event_id, v_size, v_monopoly, v_original
  from public.stalls s join public.stall_types st on st.id = s.stall_type_id
  where s.id = p_stall_id;

  if v_event_id is null then
    raise exception 'STALL_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_base := coalesce(p_negotiated_price_paise, v_original);

  v_discount := public.best_discount_total(v_event_id, p_category_id, v_size, v_monopoly,
                  p_stall_id, v_uid, v_base, 1);

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    v_coupon := public.validate_coupon(p_coupon_code, v_event_id, p_category_id, p_stall_id,
                  v_uid, v_base - v_discount);
    if (v_coupon->>'valid')::boolean then
      v_coupon_discount := (v_coupon->>'discount_paise')::bigint;
    end if;
  end if;

  v_final := greatest(v_base - v_discount - v_coupon_discount, 0);
  v_advance := public.compute_required_advance(p_stall_id, v_final);
  v_app_credit := public.unused_application_fee_credit(v_uid);
  v_app_applied := least(v_app_credit, v_advance);
  v_additional_advance := greatest(v_advance - v_app_applied, 0);

  return jsonb_build_object(
    'original_price_paise', v_original,
    'negotiated_price_paise', p_negotiated_price_paise,
    'base_price_paise', v_base,
    'discount_paise', v_discount,
    'coupon', v_coupon,
    'coupon_discount_paise', v_coupon_discount,
    'final_price_paise', v_final,
    'required_advance_paise', v_advance,
    'application_fee_credit_available_paise', v_app_credit,
    'application_fee_applied_paise', v_app_applied,
    'additional_advance_required_paise', v_additional_advance,
    'balance_after_advance_paise', greatest(v_final - v_advance, 0)
  );
end;
$$;

grant execute on function public.compute_price_breakdown(uuid, uuid, text, bigint, uuid) to authenticated;


-- ===================================================================
-- Migration: 0017_fn_negotiation_and_booking.sql
-- ===================================================================
-- =====================================================================
-- Migration 0017: Negotiation workflow + booking lifecycle orchestration
-- =====================================================================

-- ---------------------------------------------------------------------
-- convert_reservation_to_booking() — turns an active hold into a real
-- stall_allocations row once the user has submitted registration details
-- ---------------------------------------------------------------------
create or replace function public.convert_reservation_to_booking(
  p_reservation_id uuid, p_registration_id uuid default null, p_coupon_code text default null
) returns public.stall_allocations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.stall_reservations;
  v_size public.stall_size;
  v_monopoly public.stall_monopoly;
  v_breakdown jsonb;
  v_alloc public.stall_allocations;
  v_app_payment_id uuid;
begin
  select * into r from public.stall_reservations
    where id = p_reservation_id and user_id = v_uid and status = 'active'
    for update;

  if r.id is null then
    raise exception 'RESERVATION_NOT_FOUND_OR_EXPIRED' using errcode = 'P0001';
  end if;
  if r.expires_at < now() then
    update public.stall_reservations set status = 'expired' where id = r.id;
    raise exception 'RESERVATION_EXPIRED' using errcode = 'P0001';
  end if;

  select st.size_type, st.monopoly_type into v_size, v_monopoly
  from public.stalls s join public.stall_types st on st.id = s.stall_type_id
  where s.id = r.stall_id;

  if r.category_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(r.event_id::text || ':' || r.category_id::text, 0));
    if v_monopoly = 'monopoly' then
      perform public.assert_monopoly_available(r.event_id, r.category_id, r.id);
    end if;
  end if;

  v_breakdown := public.compute_price_breakdown(r.stall_id, r.category_id, p_coupon_code, null, v_uid);

  insert into public.stall_allocations (
    event_id, stall_id, reservation_id, user_id, registration_id, category_id,
    size_type, monopoly_type, original_price_paise, discount_paise, coupon_discount_paise,
    final_price_paise, required_advance_paise, application_fee_applied_paise, status
  ) values (
    r.event_id, r.stall_id, r.id, v_uid, p_registration_id, r.category_id,
    v_size, v_monopoly,
    (v_breakdown->>'original_price_paise')::bigint,
    (v_breakdown->>'discount_paise')::bigint,
    (v_breakdown->>'coupon_discount_paise')::bigint,
    (v_breakdown->>'final_price_paise')::bigint,
    (v_breakdown->>'required_advance_paise')::bigint,
    (v_breakdown->>'application_fee_applied_paise')::bigint,
    'reserved'
  ) returning * into v_alloc;

  update public.stall_reservations set status = 'converted' where id = r.id;

  if (v_breakdown->'coupon'->>'valid')::boolean is true then
    insert into public.coupon_usages (coupon_id, user_id, allocation_id, discount_paise)
    values ((v_breakdown->'coupon'->>'coupon_id')::uuid, v_uid, v_alloc.id,
            (v_breakdown->'coupon'->>'discount_paise')::bigint);
  end if;

  if (v_breakdown->>'application_fee_applied_paise')::bigint > 0 then
    select p.id into v_app_payment_id from public.payments p
      where p.user_id = v_uid and p.purpose = 'application_fee' and p.status = 'verified'
      order by p.created_at asc limit 1;

    insert into public.adjustments (allocation_id, kind, amount_paise, reason, source_payment_id, created_by)
    values (v_alloc.id, 'credit', (v_breakdown->>'application_fee_applied_paise')::bigint,
            'Application fee (Rs.99) credited against stall advance', v_app_payment_id, v_uid);

    if v_app_payment_id is not null then
      insert into public.payment_allocations (payment_id, allocation_id, amount_paise, note)
      values (v_app_payment_id, v_alloc.id, (v_breakdown->>'application_fee_applied_paise')::bigint,
              'Application fee credit');
    end if;
  end if;

  perform public.write_audit_log('booking.create', 'stall_allocations', v_alloc.id, null, to_jsonb(v_alloc));
  return v_alloc;
end;
$$;

grant execute on function public.convert_reservation_to_booking(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- recompute_allocation_status() — derives booking status from the ledger
-- (allocation_ledger_v) rather than trusting any client-sent status
-- ---------------------------------------------------------------------
create or replace function public.recompute_allocation_status(p_allocation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.stall_allocations;
  v_paid bigint;
  v_new_status public.booking_status;
  v_new_stall_status public.stall_status;
begin
  select * into a from public.stall_allocations where id = p_allocation_id for update;
  if a.id is null then return; end if;
  if a.status in ('cancelled', 'completed') then return; end if;

  select coalesce(paid_via_payments_paise,0) + coalesce(net_adjustments_paise,0) - coalesce(refunded_paise,0)
    into v_paid
  from public.allocation_ledger_v where allocation_id = p_allocation_id;

  v_new_status := a.status;
  v_new_stall_status := 'reserved';

  if a.status in ('draft', 'reserved', 'payment_pending') then
    if v_paid >= a.required_advance_paise and a.required_advance_paise > 0 then
      v_new_status := 'pending_approval';
    elsif v_paid > 0 then
      v_new_status := 'payment_pending';
    end if;
  elsif a.status in ('confirmed', 'balance_pending') then
    v_new_stall_status := 'confirmed';
    if v_paid >= a.final_price_paise then
      v_new_status := 'fully_paid';
    else
      v_new_status := 'balance_pending';
    end if;
  elsif a.status = 'fully_paid' then
    v_new_stall_status := 'confirmed';
    if v_paid < a.final_price_paise then
      v_new_status := 'balance_pending';
    end if;
  end if;

  update public.stall_allocations set status = v_new_status where id = p_allocation_id;
  update public.stalls set status = v_new_stall_status
    where id = a.stall_id and status <> 'occupied';
end;
$$;

-- ---------------------------------------------------------------------
-- verify_payment() — admin/finance action. Marks a payment verified and
-- allocates it against the booking, then re-derives status server-side.
-- ---------------------------------------------------------------------
create or replace function public.verify_payment(p_payment_id uuid)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.payments;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  update public.payments
    set status = 'verified', verified_by = auth.uid(), verified_at = now()
    where id = p_payment_id and status = 'pending_verification'
    returning * into p;

  if p.id is null then
    raise exception 'PAYMENT_NOT_FOUND_OR_ALREADY_PROCESSED' using errcode = 'P0001';
  end if;

  if p.allocation_id is not null then
    insert into public.payment_allocations (payment_id, allocation_id, amount_paise, note)
    values (p.id, p.allocation_id, p.amount_paise, p.purpose::text);
    perform public.recompute_allocation_status(p.allocation_id);
  end if;

  perform public.write_audit_log('payment.verify', 'payments', p.id, null, to_jsonb(p));
  return p;
end;
$$;

grant execute on function public.verify_payment(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- approve_booking() / reject or cancel_booking()
-- ---------------------------------------------------------------------
create or replace function public.approve_booking(p_allocation_id uuid)
returns public.stall_allocations
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.stall_allocations;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  update public.stall_allocations
    set status = 'confirmed', confirmed_at = now()
    where id = p_allocation_id and status = 'pending_approval'
    returning * into a;

  if a.id is null then
    raise exception 'BOOKING_NOT_IN_PENDING_APPROVAL' using errcode = 'P0001';
  end if;

  update public.stalls set status = 'confirmed' where id = a.stall_id;
  perform public.recompute_allocation_status(p_allocation_id);
  perform public.write_audit_log('booking.approve', 'stall_allocations', a.id);

  select * into a from public.stall_allocations where id = p_allocation_id;
  return a;
end;
$$;

grant execute on function public.approve_booking(uuid) to authenticated;

create or replace function public.cancel_booking(p_allocation_id uuid, p_reason text default null)
returns public.stall_allocations
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.stall_allocations;
  v_uid uuid := auth.uid();
begin
  select * into a from public.stall_allocations where id = p_allocation_id for update;
  if a.id is null then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not public.is_admin() then
    if a.user_id <> v_uid then
      raise exception 'FORBIDDEN' using errcode = 'P0001';
    end if;
    if a.status not in ('draft', 'reserved', 'payment_pending') then
      raise exception 'CANNOT_SELF_CANCEL_AT_THIS_STAGE' using errcode = 'P0001';
    end if;
  end if;

  update public.stall_allocations
    set status = 'cancelled', cancelled_at = now(), cancelled_reason = p_reason
    where id = p_allocation_id
    returning * into a;

  update public.stalls set status = 'available'
    where id = a.stall_id
      and not exists (
        select 1 from public.stall_allocations x
        where x.stall_id = a.stall_id and x.id <> a.id and x.status not in ('cancelled','completed')
      );

  perform public.write_audit_log('booking.cancel', 'stall_allocations', a.id, null,
    jsonb_build_object('reason', p_reason));
  return a;
end;
$$;

grant execute on function public.cancel_booking(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- NEGOTIATION WORKFLOW
-- ---------------------------------------------------------------------
create or replace function public.request_negotiation(
  p_allocation_id uuid, p_offer_price_paise bigint, p_message text default null
) returns public.negotiation_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  a public.stall_allocations;
  v_rule public.negotiation_rules;
  v_min bigint;
  n public.negotiation_requests;
begin
  select * into a from public.stall_allocations where id = p_allocation_id and user_id = v_uid;
  if a.id is null then raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0001'; end if;
  if a.status not in ('draft','reserved','payment_pending') then
    raise exception 'NEGOTIATION_NOT_ALLOWED_AT_THIS_STAGE' using errcode = 'P0001';
  end if;
  if not public.stall_is_negotiable(a.stall_id) then
    raise exception 'STALL_IS_FIXED_PRICE' using errcode = 'P0001';
  end if;

  select * into v_rule from public.negotiation_rules where event_id = a.event_id;
  if v_rule.id is null then select * into v_rule from public.negotiation_rules where event_id is null; end if;

  if a.monopoly_type = 'monopoly' and coalesce(v_rule.monopoly_negotiable, false) = false then
    raise exception 'MONOPOLY_STALLS_NOT_NEGOTIABLE' using errcode = 'P0001';
  end if;
  if v_rule.excluded_category_ids is not null and a.category_id = any(v_rule.excluded_category_ids) then
    raise exception 'CATEGORY_NOT_NEGOTIABLE' using errcode = 'P0001';
  end if;

  v_min := coalesce(v_rule.min_price_paise, 0);
  if v_rule.max_discount_pct is not null then
    v_min := greatest(v_min, ceil(a.original_price_paise * (1 - v_rule.max_discount_pct / 100.0))::bigint);
  end if;
  if p_offer_price_paise < v_min or p_offer_price_paise >= a.original_price_paise then
    raise exception 'OFFER_OUT_OF_ALLOWED_RANGE' using errcode = 'P0001';
  end if;

  insert into public.negotiation_requests (
    allocation_id, stall_id, user_id, original_price_paise,
    max_counter_offers, expires_at
  ) values (
    a.id, a.stall_id, v_uid, a.original_price_paise,
    coalesce(v_rule.max_counter_offers, 3),
    now() + make_interval(hours => coalesce(v_rule.offer_expiry_hours, 24))
  ) returning * into n;

  insert into public.negotiation_offers (negotiation_id, actor, actor_id, kind, price_paise, message)
  values (n.id, 'user', v_uid, 'user_offer', p_offer_price_paise, p_message);

  perform public.write_audit_log('negotiation.request', 'negotiation_requests', n.id);
  return n;
end;
$$;

grant execute on function public.request_negotiation(uuid, bigint, text) to authenticated;

-- apply_negotiation_settlement() — shared by admin-approve and user-accept
create or replace function public.apply_negotiation_settlement(p_negotiation_id uuid, p_price_paise bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n public.negotiation_requests;
  a public.stall_allocations;
  v_breakdown jsonb;
begin
  select * into n from public.negotiation_requests where id = p_negotiation_id;
  select * into a from public.stall_allocations where id = n.allocation_id;

  update public.negotiation_requests
    set status = 'approved', final_price_paise = p_price_paise
    where id = p_negotiation_id;

  v_breakdown := public.compute_price_breakdown(a.stall_id, a.category_id, null, p_price_paise, a.user_id);

  update public.stall_allocations set
    negotiated_price_paise = p_price_paise,
    discount_paise = (v_breakdown->>'discount_paise')::bigint,
    final_price_paise = greatest(p_price_paise - (v_breakdown->>'discount_paise')::bigint - a.coupon_discount_paise, 0),
    required_advance_paise = public.compute_required_advance(a.stall_id,
      greatest(p_price_paise - (v_breakdown->>'discount_paise')::bigint - a.coupon_discount_paise, 0))
    where id = a.id;

  perform public.recompute_allocation_status(a.id);
end;
$$;

create or replace function public.admin_negotiation_action(
  p_negotiation_id uuid, p_action text, p_price_paise bigint default null, p_message text default null
) returns public.negotiation_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  n public.negotiation_requests;
  v_uid uuid := auth.uid();
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
  select * into n from public.negotiation_requests where id = p_negotiation_id for update;
  if n.id is null or n.status not in ('pending','countered') then
    raise exception 'NEGOTIATION_NOT_OPEN' using errcode = 'P0001';
  end if;

  if p_action = 'approve' then
    perform public.apply_negotiation_settlement(n.id, coalesce(p_price_paise,
      (select price_paise from public.negotiation_offers where negotiation_id = n.id
        order by created_at desc limit 1)));
    insert into public.negotiation_offers (negotiation_id, actor, actor_id, kind, price_paise, message)
      values (n.id, 'admin', v_uid, 'admin_approve', p_price_paise, p_message);

  elsif p_action = 'reject' then
    update public.negotiation_requests set status = 'rejected' where id = n.id;
    insert into public.negotiation_offers (negotiation_id, actor, actor_id, kind, message)
      values (n.id, 'admin', v_uid, 'admin_reject', p_message);

  elsif p_action = 'counter' then
    if n.counter_count >= n.max_counter_offers then
      raise exception 'MAX_COUNTER_OFFERS_REACHED' using errcode = 'P0001';
    end if;
    if p_price_paise is null then raise exception 'PRICE_REQUIRED' using errcode = 'P0001'; end if;
    update public.negotiation_requests
      set status = 'countered', counter_count = counter_count + 1
      where id = n.id;
    insert into public.negotiation_offers (negotiation_id, actor, actor_id, kind, price_paise, message)
      values (n.id, 'admin', v_uid, 'admin_counter', p_price_paise, p_message);
  else
    raise exception 'INVALID_ACTION' using errcode = 'P0001';
  end if;

  perform public.write_audit_log('negotiation.' || p_action, 'negotiation_requests', n.id);
  select * into n from public.negotiation_requests where id = p_negotiation_id;
  return n;
end;
$$;

grant execute on function public.admin_negotiation_action(uuid, text, bigint, text) to authenticated;

create or replace function public.user_negotiation_action(
  p_negotiation_id uuid, p_action text, p_price_paise bigint default null, p_message text default null
) returns public.negotiation_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  n public.negotiation_requests;
  v_uid uuid := auth.uid();
begin
  select * into n from public.negotiation_requests where id = p_negotiation_id and user_id = v_uid for update;
  if n.id is null or n.status <> 'countered' then
    raise exception 'NOTHING_TO_RESPOND_TO' using errcode = 'P0001';
  end if;

  if p_action = 'accept' then
    perform public.apply_negotiation_settlement(n.id,
      (select price_paise from public.negotiation_offers where negotiation_id = n.id
        order by created_at desc limit 1));
    insert into public.negotiation_offers (negotiation_id, actor, actor_id, kind, message)
      values (n.id, 'user', v_uid, 'user_accept', p_message);

  elsif p_action = 'reject' then
    update public.negotiation_requests set status = 'rejected' where id = n.id;
    insert into public.negotiation_offers (negotiation_id, actor, actor_id, kind, message)
      values (n.id, 'user', v_uid, 'user_reject', p_message);

  elsif p_action = 'counter' then
    if n.counter_count >= n.max_counter_offers then
      raise exception 'MAX_COUNTER_OFFERS_REACHED' using errcode = 'P0001';
    end if;
    if p_price_paise is null then raise exception 'PRICE_REQUIRED' using errcode = 'P0001'; end if;
    update public.negotiation_requests
      set status = 'countered', counter_count = counter_count + 1
      where id = n.id;
    insert into public.negotiation_offers (negotiation_id, actor, actor_id, kind, price_paise, message)
      values (n.id, 'user', v_uid, 'user_counter', p_price_paise, p_message);
  else
    raise exception 'INVALID_ACTION' using errcode = 'P0001';
  end if;

  perform public.write_audit_log('negotiation.user_' || p_action, 'negotiation_requests', n.id);
  select * into n from public.negotiation_requests where id = p_negotiation_id;
  return n;
end;
$$;

grant execute on function public.user_negotiation_action(uuid, text, bigint, text) to authenticated;

create or replace function public.expire_negotiations() returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with x as (
    update public.negotiation_requests set status = 'expired'
      where status in ('pending','countered') and expires_at < now()
      returning id
  )
  insert into public.negotiation_offers (negotiation_id, actor, kind)
  select id, 'admin', 'expired' from x;
  get diagnostics v_count = row_count;
  return v_count;
end; $$;

grant execute on function public.expire_negotiations() to authenticated, anon;


-- ===================================================================
-- Migration: 0018_fn_documents_invoices_notifications.sql
-- ===================================================================
-- =====================================================================
-- Migration 0018: Document review, invoice generation, notifications,
-- public settings accessor, payment submission
-- =====================================================================

-- ---------------------------------------------------------------------
-- notify() — small helper, used by several functions below
-- ---------------------------------------------------------------------
create or replace function public.notify(
  p_user_id uuid, p_type public.notification_type, p_title text,
  p_body text default null, p_link_path text default null
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, type, title, body, link_path)
  values (p_user_id, p_type, p_title, p_body, p_link_path);
$$;

-- ---------------------------------------------------------------------
-- upload_document_version() — records a newly uploaded file (the file
-- itself is written to Storage by the client first via a signed path;
-- this just registers the metadata row + bumps the version)
-- ---------------------------------------------------------------------
create or replace function public.upload_document_version(
  p_kind public.document_kind, p_registration_id uuid, p_storage_path text,
  p_original_filename text, p_mime_type text, p_file_size_bytes bigint
) returns public.document_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_doc public.documents;
  v_version int;
  v_row public.document_versions;
begin
  select * into v_doc from public.documents
    where user_id = v_uid and kind = p_kind
      and (registration_id is not distinct from p_registration_id);

  if v_doc.id is null then
    insert into public.documents (user_id, registration_id, kind)
    values (v_uid, p_registration_id, p_kind)
    returning * into v_doc;
    v_version := 1;
  else
    v_version := v_doc.current_version + 1;
  end if;

  insert into public.document_versions (
    document_id, version, storage_path, original_filename, mime_type, file_size_bytes, status
  ) values (
    v_doc.id, v_version, p_storage_path, p_original_filename, p_mime_type, p_file_size_bytes, 'pending'
  ) returning * into v_row;

  perform public.write_audit_log('document.upload', 'documents', v_doc.id, null, to_jsonb(v_row));
  return v_row;
end;
$$;

grant execute on function public.upload_document_version(public.document_kind, uuid, text, text, text, bigint) to authenticated;

-- ---------------------------------------------------------------------
-- review_document() — admin approves / rejects / requests re-upload
-- ---------------------------------------------------------------------
create or replace function public.review_document(
  p_document_version_id uuid, p_action text,
  p_reason public.document_rejection_reason default null, p_note text default null
) returns public.document_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.document_versions;
  v_doc public.documents;
  v_status public.document_status;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;

  v_status := case p_action
    when 'approve' then 'approved'::public.document_status
    when 'reject' then 'rejected'::public.document_status
    when 'reupload' then 'reupload_requested'::public.document_status
    else null
  end;
  if v_status is null then raise exception 'INVALID_ACTION' using errcode = 'P0001'; end if;

  update public.document_versions
    set status = v_status, reviewed_by = auth.uid(), reviewed_at = now(),
        rejection_reason = p_reason, rejection_note = p_note
    where id = p_document_version_id
    returning * into v;

  select * into v_doc from public.documents where id = v.document_id;

  if v_status = 'approved' then
    perform public.notify(v_doc.user_id, 'document_approved', 'Document approved',
      v_doc.kind::text || ' has been approved.');
  else
    perform public.notify(v_doc.user_id, 'document_reupload_required', 'Document needs attention',
      coalesce(p_note, p_reason::text, 'Please re-upload this document.'));
  end if;

  perform public.write_audit_log('document.review', 'document_versions', v.id, null, to_jsonb(v));
  return v;
end;
$$;

grant execute on function public.review_document(uuid, text, public.document_rejection_reason, text) to authenticated;

-- ---------------------------------------------------------------------
-- submit_payment() — user records a payment claim (UPI/UTR); it stays
-- 'pending_verification' until an admin calls verify_payment()
-- ---------------------------------------------------------------------
create or replace function public.submit_payment(
  p_purpose public.payment_purpose, p_amount_paise bigint, p_method public.payment_method,
  p_allocation_id uuid default null, p_registration_id uuid default null,
  p_utr_reference text default null, p_proof_storage_path text default null
) returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_event_id uuid;
  p public.payments;
begin
  if p_allocation_id is not null then
    select event_id into v_event_id from public.stall_allocations
      where id = p_allocation_id and user_id = v_uid;
    if v_event_id is null then raise exception 'ALLOCATION_NOT_FOUND' using errcode = 'P0001'; end if;
  end if;

  insert into public.payments (
    user_id, event_id, allocation_id, registration_id, purpose, amount_paise,
    method, utr_reference, proof_storage_path, status
  ) values (
    v_uid, v_event_id, p_allocation_id, p_registration_id, p_purpose, p_amount_paise,
    p_method, p_utr_reference, p_proof_storage_path, 'pending_verification'
  ) returning * into p;

  perform public.write_audit_log('payment.submit', 'payments', p.id, null, to_jsonb(p));
  return p;
end;
$$;

grant execute on function public.submit_payment(public.payment_purpose, bigint, public.payment_method, uuid, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- generate_invoice() — admin/finance action, snapshots a booking or
-- application-fee payment into an immutable invoice + line items
-- ---------------------------------------------------------------------
create or replace function public.generate_invoice(
  p_user_id uuid, p_payment_id uuid default null, p_allocation_id uuid default null,
  p_registration_id uuid default null, p_invoice_type public.invoice_type default 'non_gst',
  p_description text default 'Stall booking', p_amount_paise bigint default 0,
  p_tax_rate_pct numeric default 0
) returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings jsonb;
  v_number text;
  v_tax bigint;
  v_event_id uuid;
  inv public.invoices;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;

  select value into v_settings from public.system_settings where key = 'business_details';
  select value->>'prefix' into v_number from public.system_settings where key = 'invoice_settings';
  v_number := public.next_invoice_number(coalesce(v_number, 'IVRA'));
  v_tax := floor(p_amount_paise * p_tax_rate_pct / 100.0)::bigint;

  if p_allocation_id is not null then
    select event_id into v_event_id from public.stall_allocations where id = p_allocation_id;
  end if;

  insert into public.invoices (
    invoice_number, invoice_type, user_id, event_id, allocation_id, payment_id, registration_id,
    business_name, business_address, gstin, pan, subtotal_paise, tax_paise, total_paise, generated_by
  ) values (
    v_number, p_invoice_type, p_user_id, v_event_id, p_allocation_id, p_payment_id, p_registration_id,
    coalesce(v_settings->>'legal_name', 'IVRA Events'), v_settings->>'address',
    v_settings->>'gstin', v_settings->>'pan', p_amount_paise, v_tax, p_amount_paise + v_tax, auth.uid()
  ) returning * into inv;

  insert into public.invoice_items (invoice_id, description, quantity, unit_price_paise, tax_rate_pct, amount_paise)
  values (inv.id, p_description, 1, p_amount_paise, p_tax_rate_pct, p_amount_paise + v_tax);

  perform public.notify(p_user_id, 'invoice_generated', 'Invoice generated', v_number, '/invoices');
  perform public.write_audit_log('invoice.generate', 'invoices', inv.id);
  return inv;
end;
$$;

grant execute on function public.generate_invoice(uuid, uuid, uuid, uuid, public.invoice_type, text, bigint, numeric) to authenticated;

-- ---------------------------------------------------------------------
-- get_public_settings() — the only settings surface exposed to clients
-- ---------------------------------------------------------------------
create or replace function public.get_public_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'application_fee_paise', (select value from public.system_settings where key = 'application_fee_paise'),
    'upi_details', (select value from public.system_settings where key = 'upi_details'),
    'document_limits', (select value from public.system_settings where key = 'document_limits'),
    'business_name', (select value->>'legal_name' from public.system_settings where key = 'business_details')
  );
$$;

grant execute on function public.get_public_settings() to authenticated, anon;


-- ===================================================================
-- Migration: 0019_rls_policies.sql
-- ===================================================================
-- =====================================================================
-- Migration 0019: Row Level Security — enabled on every table.
--
-- Design: almost all WRITES happen through the SECURITY DEFINER
-- functions in migrations 0015-0018 (owned by the migration role, which
-- also owns the tables, so those functions transparently bypass RLS —
-- standard Supabase pattern). The policies below therefore mostly govern
-- SELECT visibility, plus a small number of direct-insert cases
-- (drafting a registration, uploading a document is done via RPC only,
-- creating a support ticket/message) that are safe for a user to do
-- directly under `user_id = auth.uid()`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_support_staff());

create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- roles / user_roles
-- ---------------------------------------------------------------------
alter table public.roles enable row level security;
create policy roles_read_all on public.roles for select using (true);

alter table public.user_roles enable row level security;
create policy user_roles_select_own on public.user_roles
  for select using (user_id = auth.uid() or public.is_admin());
create policy user_roles_admin_write on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- categories — public read, admin write
-- ---------------------------------------------------------------------
alter table public.categories enable row level security;
create policy categories_read_all on public.categories for select using (true);
create policy categories_admin_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- events / event_categories — public read of non-draft events
-- ---------------------------------------------------------------------
alter table public.events enable row level security;
create policy events_read_public on public.events
  for select using (status <> 'draft' or public.is_admin() or public.is_support_staff());
create policy events_admin_write on public.events
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.event_categories enable row level security;
create policy event_categories_read on public.event_categories
  for select using (true);
create policy event_categories_admin_write on public.event_categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- stall_types / stalls — public read (needed for the stall map)
-- ---------------------------------------------------------------------
alter table public.stall_types enable row level security;
create policy stall_types_read on public.stall_types for select using (true);
create policy stall_types_admin_write on public.stall_types
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.stall_price_history enable row level security;
create policy stall_price_history_admin_read on public.stall_price_history
  for select using (public.is_admin());

alter table public.stalls enable row level security;
create policy stalls_read on public.stalls for select using (true);
create policy stalls_admin_write on public.stalls
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- stall_reservations — own rows only; writes via RPC (reserve_stall,
-- cancel_reservation) which run SECURITY DEFINER and bypass these
-- policies, so no direct insert/update policy is granted here.
-- ---------------------------------------------------------------------
alter table public.stall_reservations enable row level security;
create policy stall_reservations_select_own on public.stall_reservations
  for select using (user_id = auth.uid() or public.is_admin() or public.is_support_staff());

-- ---------------------------------------------------------------------
-- stall_allocations (bookings) — own rows only; all writes via RPC
-- ---------------------------------------------------------------------
alter table public.stall_allocations enable row level security;
create policy stall_allocations_select_own on public.stall_allocations
  for select using (user_id = auth.uid() or public.is_admin() or public.is_support_staff());

-- ---------------------------------------------------------------------
-- registrations + type-specific detail tables
-- Users may INSERT/UPDATE their own DRAFT registration directly (the
-- detailed form autosaves); once submitted, only admin (via review flow)
-- can change status. Server functions still gate document approval etc.
-- ---------------------------------------------------------------------
alter table public.registrations enable row level security;
create policy registrations_select_own on public.registrations
  for select using (user_id = auth.uid() or public.is_admin() or public.is_support_staff());
create policy registrations_insert_own on public.registrations
  for insert with check (user_id = auth.uid());
create policy registrations_update_own_draft on public.registrations
  for update using (user_id = auth.uid() and status in ('draft','changes_requested'))
  with check (user_id = auth.uid());
create policy registrations_admin_write on public.registrations
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.vendor_registrations enable row level security;
create policy vendor_registrations_owner on public.vendor_registrations
  for all using (
    exists (select 1 from public.registrations r where r.id = registration_id
      and (r.user_id = auth.uid() or public.is_admin() or public.is_support_staff()))
  ) with check (
    exists (select 1 from public.registrations r where r.id = registration_id
      and r.user_id = auth.uid() and r.status in ('draft','changes_requested'))
    or public.is_admin()
  );

alter table public.canopy_registrations enable row level security;
create policy canopy_registrations_owner on public.canopy_registrations
  for all using (
    exists (select 1 from public.registrations r where r.id = registration_id
      and (r.user_id = auth.uid() or public.is_admin() or public.is_support_staff()))
  ) with check (
    exists (select 1 from public.registrations r where r.id = registration_id
      and r.user_id = auth.uid() and r.status in ('draft','changes_requested'))
    or public.is_admin()
  );

alter table public.game_registrations enable row level security;
create policy game_registrations_owner on public.game_registrations
  for all using (
    exists (select 1 from public.registrations r where r.id = registration_id
      and (r.user_id = auth.uid() or public.is_admin() or public.is_support_staff()))
  ) with check (
    exists (select 1 from public.registrations r where r.id = registration_id
      and r.user_id = auth.uid() and r.status in ('draft','changes_requested'))
    or public.is_admin()
  );

-- ---------------------------------------------------------------------
-- documents / document_versions — strictly own; review via RPC only.
-- Support agents are deliberately excluded (Aadhaar/PAN are off-limits
-- to support staff per spec #46) — only admin + the owner may see them.
-- ---------------------------------------------------------------------
alter table public.documents enable row level security;
create policy documents_select_own on public.documents
  for select using (user_id = auth.uid() or public.is_admin());

alter table public.document_versions enable row level security;
create policy document_versions_select_own on public.document_versions
  for select using (
    exists (select 1 from public.documents d where d.id = document_id
      and (d.user_id = auth.uid() or public.is_admin()))
  );

-- ---------------------------------------------------------------------
-- discounts / discount_usages / coupons / coupon_usages — admin only.
-- Regular users never see these tables directly; they interact only via
-- compute_price_breakdown()/validate_coupon() RPCs.
-- ---------------------------------------------------------------------
alter table public.discounts enable row level security;
create policy discounts_admin_all on public.discounts
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.discount_usages enable row level security;
create policy discount_usages_admin_read on public.discount_usages
  for select using (public.is_admin() or user_id = auth.uid());

alter table public.coupons enable row level security;
create policy coupons_admin_all on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.coupon_usages enable row level security;
create policy coupon_usages_read on public.coupon_usages
  for select using (public.is_admin() or user_id = auth.uid());

-- ---------------------------------------------------------------------
-- negotiations — own + admin; all mutation via RPC
-- ---------------------------------------------------------------------
alter table public.negotiation_requests enable row level security;
create policy negotiation_requests_select on public.negotiation_requests
  for select using (user_id = auth.uid() or public.is_admin() or public.is_support_staff());

alter table public.negotiation_offers enable row level security;
create policy negotiation_offers_select on public.negotiation_offers
  for select using (
    exists (select 1 from public.negotiation_requests n where n.id = negotiation_id
      and (n.user_id = auth.uid() or public.is_admin() or public.is_support_staff()))
  );

alter table public.negotiation_rules enable row level security;
create policy negotiation_rules_read on public.negotiation_rules for select using (true);
create policy negotiation_rules_admin_write on public.negotiation_rules
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- payments / payment_allocations / adjustments / refunds
-- Users may INSERT their own payment claim only via submit_payment()
-- (SECURITY DEFINER — bypasses RLS); direct table writes are blocked.
-- ---------------------------------------------------------------------
alter table public.payments enable row level security;
create policy payments_select_own on public.payments
  for select using (user_id = auth.uid() or public.is_admin() or public.is_support_staff());

alter table public.payment_allocations enable row level security;
create policy payment_allocations_select on public.payment_allocations
  for select using (
    public.is_admin() or exists (
      select 1 from public.payments p where p.id = payment_id and p.user_id = auth.uid()
    )
  );

alter table public.adjustments enable row level security;
create policy adjustments_select on public.adjustments
  for select using (
    public.is_admin() or exists (
      select 1 from public.stall_allocations a where a.id = allocation_id and a.user_id = auth.uid()
    )
  );

alter table public.refunds enable row level security;
create policy refunds_select on public.refunds
  for select using (
    public.is_admin() or exists (
      select 1 from public.payments p where p.id = payment_id and p.user_id = auth.uid()
    )
  );
create policy refunds_admin_write on public.refunds
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- invoices / invoice_items — own + admin, read only (generated via RPC)
-- ---------------------------------------------------------------------
alter table public.invoices enable row level security;
create policy invoices_select_own on public.invoices
  for select using (user_id = auth.uid() or public.is_admin());

alter table public.invoice_items enable row level security;
create policy invoice_items_select on public.invoice_items
  for select using (
    exists (select 1 from public.invoices i where i.id = invoice_id
      and (i.user_id = auth.uid() or public.is_admin()))
  );

-- ---------------------------------------------------------------------
-- support — user owns their ticket; support staff (admin/manager/agent)
-- can see and reply to all tickets
-- ---------------------------------------------------------------------
alter table public.support_tickets enable row level security;
create policy support_tickets_select on public.support_tickets
  for select using (user_id = auth.uid() or public.is_support_staff());
create policy support_tickets_insert_own on public.support_tickets
  for insert with check (user_id = auth.uid());
create policy support_tickets_update on public.support_tickets
  for update using (user_id = auth.uid() or public.is_support_staff())
  with check (user_id = auth.uid() or public.is_support_staff());

alter table public.support_messages enable row level security;
create policy support_messages_select on public.support_messages
  for select using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id
      and (t.user_id = auth.uid() or public.is_support_staff()))
  );
create policy support_messages_insert on public.support_messages
  for insert with check (
    sender_id = auth.uid() and exists (
      select 1 from public.support_tickets t where t.id = ticket_id
        and (t.user_id = auth.uid() or public.is_support_staff())
    )
  );

alter table public.support_attachments enable row level security;
create policy support_attachments_select on public.support_attachments
  for select using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id
      and (t.user_id = auth.uid() or public.is_support_staff()))
  );
create policy support_attachments_insert on public.support_attachments
  for insert with check (
    uploaded_by = auth.uid() and exists (
      select 1 from public.support_tickets t where t.id = ticket_id
        and (t.user_id = auth.uid() or public.is_support_staff())
    )
  );

-- ---------------------------------------------------------------------
-- notifications — strictly own
-- ---------------------------------------------------------------------
alter table public.notifications enable row level security;
create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());
create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- audit_logs — admin only, insert-only via write_audit_log(); no update
-- or delete policy exists for ANY role, making the log immutable.
-- ---------------------------------------------------------------------
alter table public.audit_logs enable row level security;
create policy audit_logs_admin_read on public.audit_logs
  for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- system_settings — admin only (clients use get_public_settings() RPC)
-- ---------------------------------------------------------------------
alter table public.system_settings enable row level security;
create policy system_settings_admin_all on public.system_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- invoice_sequences — no client access at all; only next_invoice_number()
-- ---------------------------------------------------------------------
alter table public.invoice_sequences enable row level security;


-- ===================================================================
-- Migration: 0020_storage.sql
-- ===================================================================
-- =====================================================================
-- Migration 0020: Private Storage buckets + object-level RLS
--
-- Both buckets are PRIVATE (public = false). Files are only ever
-- reached through short-lived signed URLs generated server-side
-- (see src/lib/supabase/signed-url.ts) — never a public URL.
--
-- Path conventions (enforced by the policies below via
-- storage.foldername(name), NOT just convention):
--   private-documents:   {user_id}/{document_id}/v{n}-{safe_filename}
--   support-attachments: {ticket_id}/{safe_filename}
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('private-documents', 'private-documents', false, 5242880,
    array['image/jpeg','image/png','image/webp','application/pdf']),
  ('support-attachments', 'support-attachments', false, 10485760,
    array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- private-documents — first path segment must be the uploader's own
-- user id; admin can read every object (for review); nobody can update
-- or delete (re-uploads create a NEW version/object instead, preserving
-- history per spec #26/#27).
-- ---------------------------------------------------------------------
create policy "private_documents_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'private-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "private_documents_owner_or_admin_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'private-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- explicitly no update/delete policies -> those operations are denied by
-- default under RLS for every role except the service role.

-- ---------------------------------------------------------------------
-- support-attachments — first path segment must be a ticket the caller
-- owns or is staff on.
-- ---------------------------------------------------------------------
create policy "support_attachments_participant_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'support-attachments'
    and exists (
      select 1 from public.support_tickets t
      where t.id::text = (storage.foldername(name))[1]
        and (t.user_id = auth.uid() or public.is_support_staff())
    )
  );

create policy "support_attachments_participant_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'support-attachments'
    and exists (
      select 1 from public.support_tickets t
      where t.id::text = (storage.foldername(name))[1]
        and (t.user_id = auth.uid() or public.is_support_staff())
    )
  );

-- ---------------------------------------------------------------------
-- public event banners — a small PUBLIC bucket for marketing images only
-- (never used for anything sensitive). Admin-managed.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-banners', 'event-banners', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "event_banners_public_read" on storage.objects
  for select using (bucket_id = 'event-banners');

create policy "event_banners_admin_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'event-banners' and public.is_admin());

create policy "event_banners_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'event-banners' and public.is_admin());

create policy "event_banners_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'event-banners' and public.is_admin());


-- ===================================================================
-- Migration: 0021_seed_and_bootstrap.sql
-- ===================================================================
-- =====================================================================
-- Migration 0021: Seed defaults + one-time admin bootstrap
-- =====================================================================

-- Global default negotiation rules (event_id null = fallback for any
-- event that hasn't configured its own row)
insert into public.negotiation_rules (event_id, min_price_paise, max_discount_pct, max_counter_offers, offer_expiry_hours, monopoly_negotiable)
values (null, 0, 30, 3, 24, false)
on conflict (event_id) do nothing;

-- ---------------------------------------------------------------------
-- bootstrap_first_admin() — the ONLY way to create the first admin.
-- Self-locking: once a single admin exists, this permanently refuses to
-- run again, so it can never be used as a standing privilege-escalation
-- path. Run once, right after the founding account signs up:
--
--   select public.bootstrap_first_admin('online@navrathan.com');
-- ---------------------------------------------------------------------
create or replace function public.bootstrap_first_admin(p_email citext)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_admin_exists boolean;
begin
  select exists(select 1 from public.user_roles where role_key = 'admin') into v_admin_exists;
  if v_admin_exists then
    raise exception 'ADMIN_ALREADY_BOOTSTRAPPED: grant further admins via the admin panel' using errcode = 'P0001';
  end if;

  select id into v_user_id from public.profiles where email = p_email;
  if v_user_id is null then
    raise exception 'NO_PROFILE_FOR_EMAIL: the user must sign in at least once first' using errcode = 'P0001';
  end if;

  insert into public.user_roles (user_id, role_key) values (v_user_id, 'admin')
  on conflict do nothing;

  perform public.write_audit_log('admin.bootstrap', 'user_roles', v_user_id);
end;
$$;

-- Intentionally NOT granted to authenticated/anon — must be run from the
-- Supabase SQL editor (or via the service role) by whoever controls the
-- project, exactly once.


-- ===================================================================
-- Migration: 0022_admin_extras.sql
-- ===================================================================
-- =====================================================================
-- Migration 0022: Small admin-oversight additions found while building
-- the admin dashboard.
-- =====================================================================

-- Admins can see all notifications (oversight / "did this actually fire"
-- debugging) — regular users still only ever see their own.
create policy notifications_admin_read on public.notifications
  for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- admin_kpis() — one round trip for the whole admin dashboard, computed
-- server-side so the counts always match the RLS-protected data.
-- ---------------------------------------------------------------------
create or replace function public.admin_kpis()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;

  return jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'vendors', (select count(distinct user_id) from public.user_roles where role_key = 'vendor'),
    'pending_registrations', (select count(*) from public.registrations where status in ('submitted','under_review')),
    'approved_registrations', (select count(*) from public.registrations where status = 'approved'),
    'documents_pending', (select count(*) from public.documents where status in ('pending','reupload_requested')),
    'pending_payments', (select count(*) from public.payments where status = 'pending_verification'),
    'total_revenue_paise', (select coalesce(sum(amount_paise),0) from public.payments where status = 'verified'),
    'outstanding_balance_paise', (select coalesce(sum(final_price_paise - (
        select coalesce(sum(pa.amount_paise),0) from public.payment_allocations pa
        join public.payments p on p.id = pa.payment_id where p.allocation_id = a.id and p.status='verified'
      )),0) from public.stall_allocations a where a.status in ('balance_pending','pending_approval','confirmed')),
    'stalls_available', (select count(*) from public.stalls where status = 'available'),
    'stalls_reserved', (select count(*) from public.stalls where status = 'reserved'),
    'stalls_confirmed', (select count(*) from public.stalls where status = 'confirmed'),
    'stalls_occupied', (select count(*) from public.stalls where status = 'occupied'),
    'pending_negotiations', (select count(*) from public.negotiation_requests where status in ('pending','countered')),
    'open_tickets', (select count(*) from public.support_tickets where status in ('open','in_progress','waiting_for_user')),
    'stall_type_matrix', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
        select st.size_type, st.monopoly_type,
          count(s.id) as total,
          count(s.id) filter (where s.status <> 'available') as booked,
          count(s.id) filter (where s.status = 'available') as available
        from public.stall_types st
        left join public.stalls s on s.stall_type_id = st.id
        group by st.size_type, st.monopoly_type
      ) t
    )
  );
end;
$$;

grant execute on function public.admin_kpis() to authenticated;


-- ===================================================================
-- Migration: 0023_fn_duplicate.sql
-- ===================================================================
-- =====================================================================
-- Migration 0023: Duplicate / Copy functions (admin only)
-- Copies configuration only — never users, bookings, payments,
-- documents, or audit history.
-- =====================================================================

create or replace function public.duplicate_event(p_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
  v_old public.events;
  r record;
  v_type_map jsonb := '{}'::jsonb;
  v_new_type_id uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;

  select * into v_old from public.events where id = p_event_id;
  if v_old.id is null then raise exception 'EVENT_NOT_FOUND' using errcode = 'P0001'; end if;

  insert into public.events (
    name, slug, description, venue, address, city, event_date, end_date,
    start_time, end_time, registration_start_at, registration_end_at,
    status, terms_and_conditions, allow_multiple_stalls, max_stalls_per_user,
    reservation_minutes, application_fee_paise, negotiation_enabled,
    duplicated_from_event_id, created_by
  ) values (
    v_old.name || ' (Copy)', v_old.slug || '-copy-' || substr(gen_random_uuid()::text, 1, 6),
    v_old.description, v_old.venue, v_old.address, v_old.city, v_old.event_date, v_old.end_date,
    v_old.start_time, v_old.end_time, null, null,
    'draft', v_old.terms_and_conditions, v_old.allow_multiple_stalls, v_old.max_stalls_per_user,
    v_old.reservation_minutes, v_old.application_fee_paise, v_old.negotiation_enabled,
    v_old.id, auth.uid()
  ) returning id into v_new_id;

  insert into public.event_categories (event_id, category_id, monopoly_scope)
  select v_new_id, category_id, monopoly_scope from public.event_categories where event_id = p_event_id;

  for r in select * from public.stall_types where event_id = p_event_id loop
    insert into public.stall_types (
      event_id, size_type, monopoly_type, label, width_ft, length_ft, price_paise,
      advance_kind, advance_value, is_negotiable, min_price_paise, max_discount_pct
    ) values (
      v_new_id, r.size_type, r.monopoly_type, r.label, r.width_ft, r.length_ft, r.price_paise,
      r.advance_kind, r.advance_value, r.is_negotiable, r.min_price_paise, r.max_discount_pct
    ) returning id into v_new_type_id;
    v_type_map := v_type_map || jsonb_build_object(r.id::text, v_new_type_id::text);
  end loop;

  insert into public.stalls (
    event_id, stall_type_id, stall_number, preset_category_id,
    status, map_x, map_y, map_w, map_h, map_rotation, notes
  )
  select
    v_new_id, (v_type_map ->> stall_type_id::text)::uuid, stall_number, preset_category_id,
    'available', map_x, map_y, map_w, map_h, map_rotation, notes
  from public.stalls where event_id = p_event_id;

  perform public.write_audit_log('event.duplicate', 'events', v_new_id, null,
    jsonb_build_object('source_event_id', p_event_id));

  return v_new_id;
end;
$$;

grant execute on function public.duplicate_event(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- duplicate_stall_layout() — copy just the stall inventory from one
-- event to another (e.g. re-using a venue layout for a new date)
-- ---------------------------------------------------------------------
create or replace function public.duplicate_stall_layout(p_source_event_id uuid, p_target_event_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type_map jsonb := '{}'::jsonb;
  v_new_type_id uuid;
  r record;
  v_count int;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;

  for r in select * from public.stall_types where event_id = p_source_event_id loop
    insert into public.stall_types (
      event_id, size_type, monopoly_type, label, width_ft, length_ft, price_paise,
      advance_kind, advance_value, is_negotiable, min_price_paise, max_discount_pct
    ) values (
      p_target_event_id, r.size_type, r.monopoly_type, r.label, r.width_ft, r.length_ft, r.price_paise,
      r.advance_kind, r.advance_value, r.is_negotiable, r.min_price_paise, r.max_discount_pct
    )
    on conflict (event_id, size_type, monopoly_type) do update set price_paise = excluded.price_paise
    returning id into v_new_type_id;
    v_type_map := v_type_map || jsonb_build_object(r.id::text, v_new_type_id::text);
  end loop;

  insert into public.stalls (event_id, stall_type_id, stall_number, preset_category_id, status, map_x, map_y, map_w, map_h, map_rotation, notes)
  select p_target_event_id, (v_type_map ->> stall_type_id::text)::uuid, stall_number, preset_category_id,
    'available', map_x, map_y, map_w, map_h, map_rotation, notes
  from public.stalls where event_id = p_source_event_id;

  get diagnostics v_count = row_count;
  perform public.write_audit_log('event.duplicate_stall_layout', 'events', p_target_event_id, null,
    jsonb_build_object('source_event_id', p_source_event_id, 'stalls_copied', v_count));
  return v_count;
end;
$$;

grant execute on function public.duplicate_stall_layout(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- duplicate_coupon() — new id, new code, starts inactive/draft, no
-- usage history
-- ---------------------------------------------------------------------
create or replace function public.duplicate_coupon(p_coupon_id uuid, p_new_code text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.coupons;
  v_new_id uuid;
  v_code citext;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;

  select * into c from public.coupons where id = p_coupon_id;
  if c.id is null then raise exception 'COUPON_NOT_FOUND' using errcode = 'P0001'; end if;

  v_code := coalesce(p_new_code, c.code || '-COPY-' || substr(gen_random_uuid()::text, 1, 4))::citext;

  insert into public.coupons (
    code, description, kind, value, event_id, category_id, stall_id,
    min_amount_paise, max_discount_paise, starts_at, ends_at, usage_limit, per_user_limit,
    is_stackable_with_discounts, is_active, is_draft, duplicated_from_id, created_by
  ) values (
    v_code, c.description, c.kind, c.value, c.event_id, c.category_id, c.stall_id,
    c.min_amount_paise, c.max_discount_paise, c.starts_at, c.ends_at, c.usage_limit, c.per_user_limit,
    c.is_stackable_with_discounts, false, true, c.id, auth.uid()
  ) returning id into v_new_id;

  perform public.write_audit_log('coupon.duplicate', 'coupons', v_new_id, null, jsonb_build_object('source_coupon_id', p_coupon_id));
  return v_new_id;
end;
$$;

grant execute on function public.duplicate_coupon(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- bulk_generate_stalls() — quickly populate an event's stall inventory
-- ---------------------------------------------------------------------
create or replace function public.bulk_generate_stalls(
  p_event_id uuid, p_stall_type_id uuid, p_prefix text, p_start int, p_count int
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
  for i in 0 .. p_count - 1 loop
    insert into public.stalls (event_id, stall_type_id, stall_number, map_x, map_y, map_w, map_h)
    values (
      p_event_id, p_stall_type_id, p_prefix || lpad((p_start + i)::text, 2, '0'),
      (i % 8), (i / 8), 1, 1
    )
    on conflict (event_id, stall_number) do nothing;
  end loop;
  perform public.write_audit_log('stalls.bulk_generate', 'events', p_event_id, null,
    jsonb_build_object('prefix', p_prefix, 'count', p_count));
  return p_count;
end;
$$;

grant execute on function public.bulk_generate_stalls(uuid, uuid, text, int, int) to authenticated;


-- ===================================================================
-- Migration: 0024_security_hardening.sql
-- ===================================================================
-- =====================================================================
-- Migration 0024: Function execution hardening
-- =====================================================================
-- PostgreSQL grants EXECUTE on every newly created function to PUBLIC
-- by default, which in Supabase means BOTH `anon` and `authenticated`
-- can call it directly via `supabase.rpc(...)` unless revoked. Several
-- internal-only helper functions created in earlier migrations never
-- had this default revoked, which means, until this migration:
--
--   * any authenticated user could call apply_negotiation_settlement()
--     directly to settle ANY OTHER USER's negotiation at ANY price,
--     completely bypassing admin_negotiation_action()'s approval flow
--     and the negotiation_rules (min price / max discount / etc).
--   * any authenticated (or anon) user could call notify() to spoof
--     arbitrary in-app notifications (title/body/link) at any user_id
--     — a phishing/spam vector.
--   * any authenticated user could call write_audit_log() to insert
--     forged rows into the supposedly-immutable audit trail.
--   * any authenticated user could call next_invoice_number() directly,
--     burning sequence numbers and creating gaps in invoice numbering
--     without ever generating an invoice.
--   * recompute_allocation_status() / assert_monopoly_available() and
--     the plain trigger functions were likewise callable directly,
--     though lower-risk since they only recompute derived state.
--
-- None of these were ever intended to be called by a client — they are
-- implementation details invoked only from within other SECURITY
-- DEFINER functions (which, executing as the function owner, retain
-- their own implicit EXECUTE rights regardless of what is revoked from
-- PUBLIC here). This migration revokes PUBLIC execute on all of them,
-- re-affirms the grants that legitimate client-facing RPCs and RLS
-- policy helper functions need, and sets a default so newly created
-- functions are private-by-default going forward.
-- ---------------------------------------------------------------------

-- Internal-only business-logic helpers: must never be reachable by a
-- direct RPC call from the frontend.
revoke execute on function public.notify(uuid, public.notification_type, text, text, text) from public;
revoke execute on function public.write_audit_log(text, text, uuid, jsonb, jsonb) from public;
revoke execute on function public.next_invoice_number(text) from public;
revoke execute on function public.apply_negotiation_settlement(uuid, bigint) from public;
revoke execute on function public.recompute_allocation_status(uuid) from public;
revoke execute on function public.assert_monopoly_available(uuid, uuid, uuid) from public;

-- Trigger-only functions: Postgres never checks EXECUTE privilege to
-- *fire* a trigger, so revoking these only closes off direct
-- `select public.fn()` invocation — the triggers themselves keep working.
revoke execute on function public.handle_new_auth_user() from public;
revoke execute on function public.grant_default_role() from public;
revoke execute on function public.sync_document_from_version() from public;
revoke execute on function public.touch_ticket_on_message() from public;
revoke execute on function public.log_stall_price_change() from public;
revoke execute on function public.set_updated_at() from public;

-- ---------------------------------------------------------------------
-- Re-affirm grants for the small set of read-only predicate helpers
-- that RLS policies and views legitimately evaluate on behalf of the
-- querying role (authenticated and, where the underlying policy has no
-- `to` clause and can be hit pre-login, anon too).
-- ---------------------------------------------------------------------
grant execute on function public.is_admin(uuid) to authenticated, anon;
grant execute on function public.is_support_staff(uuid) to authenticated, anon;
grant execute on function public.has_role(text, uuid) to authenticated, anon;
grant execute on function public.has_any_role(text[], uuid) to authenticated, anon;
grant execute on function public.current_user_id() to authenticated;
grant execute on function public.stall_effective_price(uuid) to authenticated, anon;
grant execute on function public.stall_is_negotiable(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Default privileges: any function created by this migration role from
-- now on starts private and must be explicitly granted, instead of
-- silently inheriting PUBLIC execute.
-- ---------------------------------------------------------------------
alter default privileges in schema public revoke execute on functions from public;


-- ===================================================================
-- Migration: 0025_admin_notifications.sql
-- ===================================================================
-- =====================================================================
-- Migration 0025: Admin-facing notification dispatch
-- =====================================================================
-- notify() itself was locked down to internal-only use in migration
-- 0024 (it must never be reachable directly, since it lets the caller
-- write an arbitrary title/body/link to any user_id). Admins still
-- have a legitimate need to notify one user or broadcast to a role, so
-- this migration adds a purpose-built, authorization-checked entry
-- point instead of re-opening notify() itself.
-- ---------------------------------------------------------------------

create or replace function public.admin_send_notification(
  p_user_id uuid, p_title text, p_body text default null, p_link_path text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN: admin only' using errcode = 'P0001';
  end if;
  perform public.notify(p_user_id, 'general', p_title, p_body, p_link_path);
  perform public.write_audit_log('notification.admin_send', 'notifications', p_user_id,
    null, jsonb_build_object('title', p_title, 'body', p_body));
end;
$$;

grant execute on function public.admin_send_notification(uuid, text, text, text) to authenticated;

-- Broadcast to every user holding a given role, or every user at all
-- when p_role_key is null. Returns the number of notifications sent.
create or replace function public.admin_broadcast_notification(
  p_title text, p_body text default null, p_link_path text default null, p_role_key text default null
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN: admin only' using errcode = 'P0001';
  end if;

  if p_role_key is null then
    insert into public.notifications (user_id, type, title, body, link_path)
    select id, 'general'::public.notification_type, p_title, p_body, p_link_path from public.profiles;
  else
    insert into public.notifications (user_id, type, title, body, link_path)
    select distinct user_id, 'general'::public.notification_type, p_title, p_body, p_link_path
    from public.user_roles where role_key = p_role_key;
  end if;

  get diagnostics v_count = row_count;
  perform public.write_audit_log('notification.admin_broadcast', 'notifications', null,
    null, jsonb_build_object('title', p_title, 'body', p_body, 'role_key', p_role_key, 'recipients', v_count));
  return v_count;
end;
$$;

grant execute on function public.admin_broadcast_notification(text, text, text, text) to authenticated;


