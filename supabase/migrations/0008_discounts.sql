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
