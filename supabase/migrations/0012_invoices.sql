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
