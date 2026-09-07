-- =====================================================================
-- Migration 0017: Negotiation workflow + booking lifecycle orchestration
-- =====================================================================

-- ---------------------------------------------------------------------
-- convert_reservation_to_booking() — turns an active hold into a real
-- stall_allocations row once the user has submitted registration details
-- ---------------------------------------------------------------------
create or replace function public.convert_reservation_to_booking(
  p_reservation_id uuid, p_registration_id uuid default null, p_coupon_code text default null
) returns public.stall_allocations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.stall_reservations;
  v_size public.stall_size;
  v_monopoly public.stall_monopoly;
  v_breakdown jsonb;
  v_alloc public.stall_allocations;
  v_app_payment_id uuid;
begin
  select * into r from public.stall_reservations
    where id = p_reservation_id and user_id = v_uid and status = 'active'
    for update;

  if r.id is null then
    raise exception 'RESERVATION_NOT_FOUND_OR_EXPIRED' using errcode = 'P0001';
  end if;
  if r.expires_at < now() then
    update public.stall_reservations set status = 'expired' where id = r.id;
    raise exception 'RESERVATION_EXPIRED' using errcode = 'P0001';
  end if;

  select st.size_type, st.monopoly_type into v_size, v_monopoly
  from public.stalls s join public.stall_types st on st.id = s.stall_type_id
  where s.id = r.stall_id;

  if r.category_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(r.event_id::text || ':' || r.category_id::text, 0));
    if v_monopoly = 'monopoly' then
      perform public.assert_monopoly_available(r.event_id, r.category_id, r.id);
    end if;
  end if;

  v_breakdown := public.compute_price_breakdown(r.stall_id, r.category_id, p_coupon_code, null, v_uid);

  insert into public.stall_allocations (
    event_id, stall_id, reservation_id, user_id, registration_id, category_id,
    size_type, monopoly_type, original_price_paise, discount_paise, coupon_discount_paise,
    final_price_paise, required_advance_paise, application_fee_applied_paise, status
  ) values (
    r.event_id, r.stall_id, r.id, v_uid, p_registration_id, r.category_id,
    v_size, v_monopoly,
    (v_breakdown->>'original_price_paise')::bigint,
    (v_breakdown->>'discount_paise')::bigint,
    (v_breakdown->>'coupon_discount_paise')::bigint,
    (v_breakdown->>'final_price_paise')::bigint,
    (v_breakdown->>'required_advance_paise')::bigint,
    (v_breakdown->>'application_fee_applied_paise')::bigint,
    'reserved'
  ) returning * into v_alloc;

  update public.stall_reservations set status = 'converted' where id = r.id;

  if (v_breakdown->'coupon'->>'valid')::boolean is true then
    insert into public.coupon_usages (coupon_id, user_id, allocation_id, discount_paise)
    values ((v_breakdown->'coupon'->>'coupon_id')::uuid, v_uid, v_alloc.id,
            (v_breakdown->'coupon'->>'discount_paise')::bigint);
  end if;

  if (v_breakdown->>'application_fee_applied_paise')::bigint > 0 then
    select p.id into v_app_payment_id from public.payments p
      where p.user_id = v_uid and p.purpose = 'application_fee' and p.status = 'verified'
      order by p.created_at asc limit 1;

    insert into public.adjustments (allocation_id, kind, amount_paise, reason, source_payment_id, created_by)
    values (v_alloc.id, 'credit', (v_breakdown->>'application_fee_applied_paise')::bigint,
            'Application fee (Rs.99) credited against stall advance', v_app_payment_id, v_uid);

    if v_app_payment_id is not null then
      insert into public.payment_allocations (payment_id, allocation_id, amount_paise, note)
      values (v_app_payment_id, v_alloc.id, (v_breakdown->>'application_fee_applied_paise')::bigint,
              'Application fee credit');
    end if;
  end if;

  perform public.write_audit_log('booking.create', 'stall_allocations', v_alloc.id, null, to_jsonb(v_alloc));
  return v_alloc;
end;
$$;

grant execute on function public.convert_reservation_to_booking(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- recompute_allocation_status() — derives booking status from the ledger
-- (allocation_ledger_v) rather than trusting any client-sent status
-- ---------------------------------------------------------------------
create or replace function public.recompute_allocation_status(p_allocation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.stall_allocations;
  v_paid bigint;
  v_new_status public.booking_status;
  v_new_stall_status public.stall_status;
begin
  select * into a from public.stall_allocations where id = p_allocation_id for update;
  if a.id is null then return; end if;
  if a.status in ('cancelled', 'completed') then return; end if;

  select coalesce(paid_via_payments_paise,0) + coalesce(net_adjustments_paise,0) - coalesce(refunded_paise,0)
    into v_paid
  from public.allocation_ledger_v where allocation_id = p_allocation_id;

  v_new_status := a.status;
  v_new_stall_status := 'reserved';

  if a.status in ('draft', 'reserved', 'payment_pending') then
    if v_paid >= a.required_advance_paise and a.required_advance_paise > 0 then
      v_new_status := 'pending_approval';
    elsif v_paid > 0 then
      v_new_status := 'payment_pending';
    end if;
  elsif a.status in ('confirmed', 'balance_pending') then
    v_new_stall_status := 'confirmed';
    if v_paid >= a.final_price_paise then
      v_new_status := 'fully_paid';
    else
      v_new_status := 'balance_pending';
    end if;
  elsif a.status = 'fully_paid' then
    v_new_stall_status := 'confirmed';
    if v_paid < a.final_price_paise then
      v_new_status := 'balance_pending';
    end if;
  end if;

  update public.stall_allocations set status = v_new_status where id = p_allocation_id;
  update public.stalls set status = v_new_stall_status
    where id = a.stall_id and status <> 'occupied';
end;
$$;

-- ---------------------------------------------------------------------
-- verify_payment() — admin/finance action. Marks a payment verified and
-- allocates it against the booking, then re-derives status server-side.
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

  if p.allocation_id is not null then
    insert into public.payment_allocations (payment_id, allocation_id, amount_paise, note)
    values (p.id, p.allocation_id, p.amount_paise, p.purpose::text);
    perform public.recompute_allocation_status(p.allocation_id);
  end if;

  perform public.write_audit_log('payment.verify', 'payments', p.id, null, to_jsonb(p));
  return p;
end;
$$;

grant execute on function public.verify_payment(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- approve_booking() / reject or cancel_booking()
-- ---------------------------------------------------------------------
create or replace function public.approve_booking(p_allocation_id uuid)
returns public.stall_allocations
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.stall_allocations;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  update public.stall_allocations
    set status = 'confirmed', confirmed_at = now()
    where id = p_allocation_id and status = 'pending_approval'
    returning * into a;

  if a.id is null then
    raise exception 'BOOKING_NOT_IN_PENDING_APPROVAL' using errcode = 'P0001';
  end if;

  update public.stalls set status = 'confirmed' where id = a.stall_id;
  perform public.recompute_allocation_status(p_allocation_id);
  perform public.write_audit_log('booking.approve', 'stall_allocations', a.id);

  select * into a from public.stall_allocations where id = p_allocation_id;
  return a;
end;
$$;

grant execute on function public.approve_booking(uuid) to authenticated;

create or replace function public.cancel_booking(p_allocation_id uuid, p_reason text default null)
returns public.stall_allocations
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.stall_allocations;
  v_uid uuid := auth.uid();
begin
  select * into a from public.stall_allocations where id = p_allocation_id for update;
  if a.id is null then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not public.is_admin() then
    if a.user_id <> v_uid then
      raise exception 'FORBIDDEN' using errcode = 'P0001';
    end if;
    if a.status not in ('draft', 'reserved', 'payment_pending') then
      raise exception 'CANNOT_SELF_CANCEL_AT_THIS_STAGE' using errcode = 'P0001';
    end if;
  end if;

  update public.stall_allocations
    set status = 'cancelled', cancelled_at = now(), cancelled_reason = p_reason
    where id = p_allocation_id
    returning * into a;

  update public.stalls set status = 'available'
    where id = a.stall_id
      and not exists (
        select 1 from public.stall_allocations x
        where x.stall_id = a.stall_id and x.id <> a.id and x.status not in ('cancelled','completed')
      );

  perform public.write_audit_log('booking.cancel', 'stall_allocations', a.id, null,
    jsonb_build_object('reason', p_reason));
  return a;
end;
$$;

grant execute on function public.cancel_booking(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- NEGOTIATION WORKFLOW
-- ---------------------------------------------------------------------
create or replace function public.request_negotiation(
  p_allocation_id uuid, p_offer_price_paise bigint, p_message text default null
) returns public.negotiation_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  a public.stall_allocations;
  v_rule public.negotiation_rules;
  v_min bigint;
  n public.negotiation_requests;
begin
  select * into a from public.stall_allocations where id = p_allocation_id and user_id = v_uid;
  if a.id is null then raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0001'; end if;
  if a.status not in ('draft','reserved','payment_pending') then
    raise exception 'NEGOTIATION_NOT_ALLOWED_AT_THIS_STAGE' using errcode = 'P0001';
  end if;
  if not public.stall_is_negotiable(a.stall_id) then
    raise exception 'STALL_IS_FIXED_PRICE' using errcode = 'P0001';
  end if;

  select * into v_rule from public.negotiation_rules where event_id = a.event_id;
  if v_rule.id is null then select * into v_rule from public.negotiation_rules where event_id is null; end if;

  if a.monopoly_type = 'monopoly' and coalesce(v_rule.monopoly_negotiable, false) = false then
    raise exception 'MONOPOLY_STALLS_NOT_NEGOTIABLE' using errcode = 'P0001';
  end if;
  if v_rule.excluded_category_ids is not null and a.category_id = any(v_rule.excluded_category_ids) then
    raise exception 'CATEGORY_NOT_NEGOTIABLE' using errcode = 'P0001';
  end if;

  v_min := coalesce(v_rule.min_price_paise, 0);
  if v_rule.max_discount_pct is not null then
    v_min := greatest(v_min, ceil(a.original_price_paise * (1 - v_rule.max_discount_pct / 100.0))::bigint);
  end if;
  if p_offer_price_paise < v_min or p_offer_price_paise >= a.original_price_paise then
    raise exception 'OFFER_OUT_OF_ALLOWED_RANGE' using errcode = 'P0001';
  end if;

  insert into public.negotiation_requests (
    allocation_id, stall_id, user_id, original_price_paise,
    max_counter_offers, expires_at
  ) values (
    a.id, a.stall_id, v_uid, a.original_price_paise,
    coalesce(v_rule.max_counter_offers, 3),
    now() + make_interval(hours => coalesce(v_rule.offer_expiry_hours, 24))
  ) returning * into n;

  insert into public.negotiation_offers (negotiation_id, actor, actor_id, kind, price_paise, message)
  values (n.id, 'user', v_uid, 'user_offer', p_offer_price_paise, p_message);

  perform public.write_audit_log('negotiation.request', 'negotiation_requests', n.id);
  return n;
end;
$$;

grant execute on function public.request_negotiation(uuid, bigint, text) to authenticated;

-- apply_negotiation_settlement() — shared by admin-approve and user-accept
create or replace function public.apply_negotiation_settlement(p_negotiation_id uuid, p_price_paise bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n public.negotiation_requests;
  a public.stall_allocations;
  v_breakdown jsonb;
begin
  select * into n from public.negotiation_requests where id = p_negotiation_id;
  select * into a from public.stall_allocations where id = n.allocation_id;

  update public.negotiation_requests
    set status = 'approved', final_price_paise = p_price_paise
    where id = p_negotiation_id;

  v_breakdown := public.compute_price_breakdown(a.stall_id, a.category_id, null, p_price_paise, a.user_id);

  update public.stall_allocations set
    negotiated_price_paise = p_price_paise,
    discount_paise = (v_breakdown->>'discount_paise')::bigint,
    final_price_paise = greatest(p_price_paise - (v_breakdown->>'discount_paise')::bigint - a.coupon_discount_paise, 0),
    required_advance_paise = public.compute_required_advance(a.stall_id,
      greatest(p_price_paise - (v_breakdown->>'discount_paise')::bigint - a.coupon_discount_paise, 0))
    where id = a.id;

  perform public.recompute_allocation_status(a.id);
end;
$$;

create or replace function public.admin_negotiation_action(
  p_negotiation_id uuid, p_action text, p_price_paise bigint default null, p_message text default null
) returns public.negotiation_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  n public.negotiation_requests;
  v_uid uuid := auth.uid();
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
  select * into n from public.negotiation_requests where id = p_negotiation_id for update;
  if n.id is null or n.status not in ('pending','countered') then
    raise exception 'NEGOTIATION_NOT_OPEN' using errcode = 'P0001';
  end if;

  if p_action = 'approve' then
    perform public.apply_negotiation_settlement(n.id, coalesce(p_price_paise,
      (select price_paise from public.negotiation_offers where negotiation_id = n.id
        order by created_at desc limit 1)));
    insert into public.negotiation_offers (negotiation_id, actor, actor_id, kind, price_paise, message)
      values (n.id, 'admin', v_uid, 'admin_approve', p_price_paise, p_message);

  elsif p_action = 'reject' then
    update public.negotiation_requests set status = 'rejected' where id = n.id;
    insert into public.negotiation_offers (negotiation_id, actor, actor_id, kind, message)
      values (n.id, 'admin', v_uid, 'admin_reject', p_message);

  elsif p_action = 'counter' then
    if n.counter_count >= n.max_counter_offers then
      raise exception 'MAX_COUNTER_OFFERS_REACHED' using errcode = 'P0001';
    end if;
    if p_price_paise is null then raise exception 'PRICE_REQUIRED' using errcode = 'P0001'; end if;
    update public.negotiation_requests
      set status = 'countered', counter_count = counter_count + 1
      where id = n.id;
    insert into public.negotiation_offers (negotiation_id, actor, actor_id, kind, price_paise, message)
      values (n.id, 'admin', v_uid, 'admin_counter', p_price_paise, p_message);
  else
    raise exception 'INVALID_ACTION' using errcode = 'P0001';
  end if;

  perform public.write_audit_log('negotiation.' || p_action, 'negotiation_requests', n.id);
  select * into n from public.negotiation_requests where id = p_negotiation_id;
  return n;
end;
$$;

grant execute on function public.admin_negotiation_action(uuid, text, bigint, text) to authenticated;

create or replace function public.user_negotiation_action(
  p_negotiation_id uuid, p_action text, p_price_paise bigint default null, p_message text default null
) returns public.negotiation_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  n public.negotiation_requests;
  v_uid uuid := auth.uid();
begin
  select * into n from public.negotiation_requests where id = p_negotiation_id and user_id = v_uid for update;
  if n.id is null or n.status <> 'countered' then
    raise exception 'NOTHING_TO_RESPOND_TO' using errcode = 'P0001';
  end if;

  if p_action = 'accept' then
    perform public.apply_negotiation_settlement(n.id,
      (select price_paise from public.negotiation_offers where negotiation_id = n.id
        order by created_at desc limit 1));
    insert into public.negotiation_offers (negotiation_id, actor, actor_id, kind, message)
      values (n.id, 'user', v_uid, 'user_accept', p_message);

  elsif p_action = 'reject' then
    update public.negotiation_requests set status = 'rejected' where id = n.id;
    insert into public.negotiation_offers (negotiation_id, actor, actor_id, kind, message)
      values (n.id, 'user', v_uid, 'user_reject', p_message);

  elsif p_action = 'counter' then
    if n.counter_count >= n.max_counter_offers then
      raise exception 'MAX_COUNTER_OFFERS_REACHED' using errcode = 'P0001';
    end if;
    if p_price_paise is null then raise exception 'PRICE_REQUIRED' using errcode = 'P0001'; end if;
    update public.negotiation_requests
      set status = 'countered', counter_count = counter_count + 1
      where id = n.id;
    insert into public.negotiation_offers (negotiation_id, actor, actor_id, kind, price_paise, message)
      values (n.id, 'user', v_uid, 'user_counter', p_price_paise, p_message);
  else
    raise exception 'INVALID_ACTION' using errcode = 'P0001';
  end if;

  perform public.write_audit_log('negotiation.user_' || p_action, 'negotiation_requests', n.id);
  select * into n from public.negotiation_requests where id = p_negotiation_id;
  return n;
end;
$$;

grant execute on function public.user_negotiation_action(uuid, text, bigint, text) to authenticated;

create or replace function public.expire_negotiations() returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with x as (
    update public.negotiation_requests set status = 'expired'
      where status in ('pending','countered') and expires_at < now()
      returning id
  )
  insert into public.negotiation_offers (negotiation_id, actor, kind)
  select id, 'admin', 'expired' from x;
  get diagnostics v_count = row_count;
  return v_count;
end; $$;

grant execute on function public.expire_negotiations() to authenticated, anon;
