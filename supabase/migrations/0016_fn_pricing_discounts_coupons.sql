-- =====================================================================
-- Migration 0016: Server-side pricing engine, discount matching,
-- coupon validation. Never trust client-supplied discount amounts.
-- =====================================================================

-- ---------------------------------------------------------------------
-- matching_discounts() — every ACTIVE discount whose scope matches this
-- booking context, with its computed rupee amount already capped
-- ---------------------------------------------------------------------
create or replace function public.matching_discounts(
  p_event_id uuid, p_category_id uuid, p_size_type public.stall_size,
  p_monopoly_type public.stall_monopoly, p_stall_id uuid, p_user_id uuid,
  p_amount_paise bigint, p_stall_count int default 1
) returns table (id uuid, amount_paise bigint, is_stackable boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select d.id,
    least(
      case d.kind
        when 'percentage' then floor(p_amount_paise * d.value / 100.0)::bigint
        else d.value::bigint
      end,
      coalesce(d.max_discount_paise, p_amount_paise),
      p_amount_paise
    ) as amount_paise,
    d.is_stackable
  from public.discounts d
  where d.is_active
    and (d.event_id is null or d.event_id = p_event_id)
    and (d.category_id is null or d.category_id = p_category_id)
    and (d.size_type is null or d.size_type = p_size_type)
    and (d.monopoly_type is null or d.monopoly_type = p_monopoly_type)
    and (d.stall_id is null or d.stall_id = p_stall_id)
    and (d.user_id is null or d.user_id = p_user_id)
    and (d.min_booking_amount_paise is null or p_amount_paise >= d.min_booking_amount_paise)
    and (d.min_stall_count is null or p_stall_count >= d.min_stall_count)
    and (d.starts_at is null or d.starts_at <= now())
    and (d.ends_at is null or d.ends_at >= now())
    and (d.usage_limit is null or
         (select count(*) from public.discount_usages du where du.discount_id = d.id) < d.usage_limit)
    and (d.per_user_limit is null or
         (select count(*) from public.discount_usages du
          where du.discount_id = d.id and du.user_id = p_user_id) < d.per_user_limit);
end;
$$;

-- ---------------------------------------------------------------------
-- best_discount_total() — applies stacking rule: all stackable discounts
-- sum together; if any non-stackable discount matches, only the single
-- highest-value candidate (stackable or not) is used instead.
-- ---------------------------------------------------------------------
create or replace function public.best_discount_total(
  p_event_id uuid, p_category_id uuid, p_size_type public.stall_size,
  p_monopoly_type public.stall_monopoly, p_stall_id uuid, p_user_id uuid,
  p_amount_paise bigint, p_stall_count int default 1
) returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_stackable_sum bigint;
  v_best_single bigint;
  v_has_non_stackable boolean;
begin
  select coalesce(sum(amount_paise) filter (where is_stackable), 0),
         coalesce(max(amount_paise), 0),
         bool_or(not is_stackable)
    into v_stackable_sum, v_best_single, v_has_non_stackable
  from public.matching_discounts(p_event_id, p_category_id, p_size_type, p_monopoly_type,
                                   p_stall_id, p_user_id, p_amount_paise, p_stall_count);

  if v_has_non_stackable then
    return least(v_best_single, p_amount_paise);
  end if;
  return least(v_stackable_sum, p_amount_paise);
end;
$$;

-- ---------------------------------------------------------------------
-- validate_coupon() — full server-side validation. Returns a jsonb
-- result; never raises for a "bad coupon", so the UI can show a message.
-- ---------------------------------------------------------------------
create or replace function public.validate_coupon(
  p_code text, p_event_id uuid, p_category_id uuid, p_stall_id uuid,
  p_user_id uuid, p_amount_paise bigint
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.coupons;
  v_discount bigint;
  v_user_uses int;
  v_total_uses int;
begin
  select * into c from public.coupons where code = p_code::citext;

  if c.id is null then
    return jsonb_build_object('valid', false, 'reason', 'Coupon not found');
  end if;
  if not c.is_active or c.is_draft then
    return jsonb_build_object('valid', false, 'reason', 'Coupon is not active');
  end if;
  if c.starts_at is not null and c.starts_at > now() then
    return jsonb_build_object('valid', false, 'reason', 'Coupon is not yet valid');
  end if;
  if c.ends_at is not null and c.ends_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'Coupon has expired');
  end if;
  if c.event_id is not null and c.event_id is distinct from p_event_id then
    return jsonb_build_object('valid', false, 'reason', 'Coupon is not valid for this event');
  end if;
  if c.category_id is not null and c.category_id is distinct from p_category_id then
    return jsonb_build_object('valid', false, 'reason', 'Coupon is not valid for this category');
  end if;
  if c.stall_id is not null and c.stall_id is distinct from p_stall_id then
    return jsonb_build_object('valid', false, 'reason', 'Coupon is not valid for this stall');
  end if;
  if c.min_amount_paise is not null and p_amount_paise < c.min_amount_paise then
    return jsonb_build_object('valid', false, 'reason', 'Booking amount is below the coupon minimum');
  end if;

  select count(*) into v_total_uses from public.coupon_usages
    where coupon_id = c.id and status = 'applied';
  if c.usage_limit is not null and v_total_uses >= c.usage_limit then
    return jsonb_build_object('valid', false, 'reason', 'Coupon usage limit reached');
  end if;

  select count(*) into v_user_uses from public.coupon_usages
    where coupon_id = c.id and user_id = p_user_id and status = 'applied';
  if v_user_uses >= c.per_user_limit then
    return jsonb_build_object('valid', false, 'reason', 'You have already used this coupon');
  end if;

  v_discount := case c.kind
    when 'percentage' then floor(p_amount_paise * c.value / 100.0)::bigint
    else c.value::bigint
  end;
  v_discount := least(v_discount, coalesce(c.max_discount_paise, p_amount_paise), p_amount_paise);

  return jsonb_build_object(
    'valid', true, 'coupon_id', c.id, 'code', c.code,
    'discount_paise', v_discount, 'stackable_with_discounts', c.is_stackable_with_discounts
  );
end;
$$;

grant execute on function public.validate_coupon(text, uuid, uuid, uuid, uuid, bigint) to authenticated;

-- ---------------------------------------------------------------------
-- compute_required_advance() — from the stall_type's advance configuration
-- ---------------------------------------------------------------------
create or replace function public.compute_required_advance(p_stall_id uuid, p_price_paise bigint)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_kind public.advance_kind;
  v_value numeric;
begin
  select st.advance_kind, st.advance_value into v_kind, v_value
  from public.stalls s join public.stall_types st on st.id = s.stall_type_id
  where s.id = p_stall_id;

  return case v_kind
    when 'full' then p_price_paise
    when 'fixed' then least(v_value::bigint, p_price_paise)
    else floor(p_price_paise * v_value / 100.0)::bigint   -- 'percentage'
  end;
end;
$$;

-- ---------------------------------------------------------------------
-- unused_application_fee_credit() — sum of this user's verified ₹99
-- application-fee payments not yet allocated to any booking
-- ---------------------------------------------------------------------
create or replace function public.unused_application_fee_credit(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(p.amount_paise), 0) - coalesce((
    select sum(pa.amount_paise) from public.payment_allocations pa
    join public.payments pp on pp.id = pa.payment_id
    where pp.user_id = p_user_id and pp.purpose = 'application_fee' and pp.status = 'verified'
  ), 0)
  from public.payments p
  where p.user_id = p_user_id and p.purpose = 'application_fee' and p.status = 'verified';
$$;

-- ---------------------------------------------------------------------
-- compute_price_breakdown() — the single source of truth the UI calls
-- to render "Price Breakdown". Pure/read-only: applies no side effects.
-- ---------------------------------------------------------------------
create or replace function public.compute_price_breakdown(
  p_stall_id uuid, p_category_id uuid default null, p_coupon_code text default null,
  p_negotiated_price_paise bigint default null, p_user_id uuid default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(p_user_id, auth.uid());
  v_event_id uuid;
  v_size public.stall_size;
  v_monopoly public.stall_monopoly;
  v_original bigint;
  v_base bigint;
  v_discount bigint;
  v_coupon jsonb := jsonb_build_object('valid', false);
  v_coupon_discount bigint := 0;
  v_advance bigint;
  v_app_credit bigint;
  v_app_applied bigint;
  v_additional_advance bigint;
  v_final bigint;
begin
  select s.event_id, st.size_type, st.monopoly_type, public.stall_effective_price(s.id)
    into v_event_id, v_size, v_monopoly, v_original
  from public.stalls s join public.stall_types st on st.id = s.stall_type_id
  where s.id = p_stall_id;

  if v_event_id is null then
    raise exception 'STALL_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_base := coalesce(p_negotiated_price_paise, v_original);

  v_discount := public.best_discount_total(v_event_id, p_category_id, v_size, v_monopoly,
                  p_stall_id, v_uid, v_base, 1);

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    v_coupon := public.validate_coupon(p_coupon_code, v_event_id, p_category_id, p_stall_id,
                  v_uid, v_base - v_discount);
    if (v_coupon->>'valid')::boolean then
      v_coupon_discount := (v_coupon->>'discount_paise')::bigint;
    end if;
  end if;

  v_final := greatest(v_base - v_discount - v_coupon_discount, 0);
  v_advance := public.compute_required_advance(p_stall_id, v_final);
  v_app_credit := public.unused_application_fee_credit(v_uid);
  v_app_applied := least(v_app_credit, v_advance);
  v_additional_advance := greatest(v_advance - v_app_applied, 0);

  return jsonb_build_object(
    'original_price_paise', v_original,
    'negotiated_price_paise', p_negotiated_price_paise,
    'base_price_paise', v_base,
    'discount_paise', v_discount,
    'coupon', v_coupon,
    'coupon_discount_paise', v_coupon_discount,
    'final_price_paise', v_final,
    'required_advance_paise', v_advance,
    'application_fee_credit_available_paise', v_app_credit,
    'application_fee_applied_paise', v_app_applied,
    'additional_advance_required_paise', v_additional_advance,
    'balance_after_advance_paise', greatest(v_final - v_advance, 0)
  );
end;
$$;

grant execute on function public.compute_price_breakdown(uuid, uuid, text, bigint, uuid) to authenticated;
