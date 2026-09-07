-- =====================================================================
-- Migration 0026: Vendor Wallet
--
-- A prepaid balance a vendor can top up and spend toward stall
-- advances/balances. Follows the app's existing payment model exactly:
-- topping up is still "pay by UPI, submit the UTR, admin verifies" (no
-- payment gateway is wired up anywhere in this app) — the only new thing
-- is that once an admin verifies a wallet top-up, the amount lands in the
-- vendor's wallet instead of against one specific booking, and they can
-- then spend it on any of their bookings without doing UPI + UTR again.
--
-- Balance is never a stored counter — like allocation_ledger_v, it's
-- always the live sum of an immutable ledger table, so it can't drift or
-- be double-spent.
-- =====================================================================

alter type public.payment_purpose add value if not exists 'wallet_topup';
alter type public.payment_method add value if not exists 'wallet';

create type public.wallet_txn_kind as enum ('credit', 'debit');

create table public.wallet_transactions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id),
  kind                  public.wallet_txn_kind not null,
  amount_paise          bigint not null check (amount_paise > 0),
  reason                text not null,
  source_payment_id     uuid references public.payments(id),
  source_allocation_id  uuid references public.stall_allocations(id),
  created_at            timestamptz not null default now()
);

create index wallet_transactions_user_idx on public.wallet_transactions (user_id);

alter table public.wallet_transactions enable row level security;

create policy wallet_transactions_select_own on public.wallet_transactions
  for select using (user_id = auth.uid() or public.is_admin() or public.is_support_staff());

-- Live balance per user — sum of credits minus sum of debits.
create or replace view public.wallet_balance_v as
select
  user_id,
  coalesce(sum(amount_paise) filter (where kind = 'credit'), 0)
    - coalesce(sum(amount_paise) filter (where kind = 'debit'), 0) as balance_paise
from public.wallet_transactions
group by user_id;

grant select on public.wallet_balance_v to authenticated;

-- ---------------------------------------------------------------------
-- verify_payment() — unchanged for every existing purpose. Gains one
-- new branch: verifying a wallet_topup credits the wallet ledger
-- instead of allocating the payment against a booking.
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

  if p.purpose = 'wallet_topup' then
    insert into public.wallet_transactions (user_id, kind, amount_paise, reason, source_payment_id)
    values (p.user_id, 'credit', p.amount_paise, 'Wallet top-up', p.id);
  elsif p.allocation_id is not null then
    insert into public.payment_allocations (payment_id, allocation_id, amount_paise, note)
    values (p.id, p.allocation_id, p.amount_paise, p.purpose::text);
    perform public.recompute_allocation_status(p.allocation_id);
  end if;

  perform public.write_audit_log('payment.verify', 'payments', p.id, null, to_jsonb(p));
  return p;
end;
$$;

-- ---------------------------------------------------------------------
-- pay_from_wallet() — spend wallet balance directly against a booking's
-- advance/balance. Self-verified (status goes straight to 'verified')
-- because the money was already verified when the wallet was topped up;
-- there's nothing left for an admin to re-check.
-- ---------------------------------------------------------------------
create or replace function public.pay_from_wallet(
  p_allocation_id uuid, p_amount_paise bigint, p_purpose public.payment_purpose default 'stall_advance'
) returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_balance bigint;
  p public.payments;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  perform 1 from public.stall_allocations where id = p_allocation_id and user_id = v_uid;
  if not found then
    raise exception 'ALLOCATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  select coalesce(balance_paise, 0) into v_balance
    from public.wallet_balance_v where user_id = v_uid;

  if coalesce(v_balance, 0) < p_amount_paise then
    raise exception 'INSUFFICIENT_WALLET_BALANCE' using errcode = 'P0001';
  end if;

  insert into public.payments (
    user_id, allocation_id, purpose, amount_paise, method, status, verified_by, verified_at
  ) values (
    v_uid, p_allocation_id, p_purpose, p_amount_paise, 'wallet', 'verified', v_uid, now()
  ) returning * into p;

  insert into public.payment_allocations (payment_id, allocation_id, amount_paise, note)
  values (p.id, p_allocation_id, p.amount_paise, 'Paid from wallet');

  insert into public.wallet_transactions (user_id, kind, amount_paise, reason, source_payment_id, source_allocation_id)
  values (v_uid, 'debit', p_amount_paise, 'Stall payment', p.id, p_allocation_id);

  perform public.recompute_allocation_status(p_allocation_id);
  perform public.write_audit_log('payment.wallet_debit', 'payments', p.id, null, to_jsonb(p));
  return p;
end;
$$;

grant execute on function public.pay_from_wallet(uuid, bigint, public.payment_purpose) to authenticated;
