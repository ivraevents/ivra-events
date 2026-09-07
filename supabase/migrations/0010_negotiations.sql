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
