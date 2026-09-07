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
