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
