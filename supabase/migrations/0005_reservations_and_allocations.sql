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
