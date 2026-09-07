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
