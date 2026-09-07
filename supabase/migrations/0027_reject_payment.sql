-- =====================================================================
-- Migration 0027: Reject Payment
--
-- Admins could only "Verify" a pending payment before this — there was
-- no way to turn down a submission that doesn't check out (wrong amount,
-- unreadable receipt, etc). This adds the missing counterpart:
-- reject_payment() marks it 'failed' (an existing payment_status value)
-- and notifies the vendor, so a rejected wallet top-up (or any other
-- payment claim) shows up distinctly from ones still pending review.
-- =====================================================================

alter type public.notification_type add value if not exists 'payment_rejected';

create or replace function public.reject_payment(p_payment_id uuid, p_reason text default null)
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
    set status = 'failed', verified_by = auth.uid(), verified_at = now(),
        notes = coalesce(p_reason, notes)
    where id = p_payment_id and status = 'pending_verification'
    returning * into p;

  if p.id is null then
    raise exception 'PAYMENT_NOT_FOUND_OR_ALREADY_PROCESSED' using errcode = 'P0001';
  end if;

  perform public.notify(
    p.user_id, 'payment_rejected', 'Payment not verified',
    coalesce(p_reason, 'Your payment submission could not be verified. Please check the details and try again.'),
    case when p.purpose = 'wallet_topup' then '/wallet' else '/payments' end
  );

  perform public.write_audit_log('payment.reject', 'payments', p.id, null, to_jsonb(p));
  return p;
end;
$$;

grant execute on function public.reject_payment(uuid, text) to authenticated;
