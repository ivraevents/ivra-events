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
