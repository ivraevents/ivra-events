-- =====================================================================
-- Migration 0023: Duplicate / Copy functions (admin only)
-- Copies configuration only — never users, bookings, payments,
-- documents, or audit history.
-- =====================================================================

create or replace function public.duplicate_event(p_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
  v_old public.events;
  r record;
  v_type_map jsonb := '{}'::jsonb;
  v_new_type_id uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;

  select * into v_old from public.events where id = p_event_id;
  if v_old.id is null then raise exception 'EVENT_NOT_FOUND' using errcode = 'P0001'; end if;

  insert into public.events (
    name, slug, description, venue, address, city, event_date, end_date,
    start_time, end_time, registration_start_at, registration_end_at,
    status, terms_and_conditions, allow_multiple_stalls, max_stalls_per_user,
    reservation_minutes, application_fee_paise, negotiation_enabled,
    duplicated_from_event_id, created_by
  ) values (
    v_old.name || ' (Copy)', v_old.slug || '-copy-' || substr(gen_random_uuid()::text, 1, 6),
    v_old.description, v_old.venue, v_old.address, v_old.city, v_old.event_date, v_old.end_date,
    v_old.start_time, v_old.end_time, null, null,
    'draft', v_old.terms_and_conditions, v_old.allow_multiple_stalls, v_old.max_stalls_per_user,
    v_old.reservation_minutes, v_old.application_fee_paise, v_old.negotiation_enabled,
    v_old.id, auth.uid()
  ) returning id into v_new_id;

  insert into public.event_categories (event_id, category_id, monopoly_scope)
  select v_new_id, category_id, monopoly_scope from public.event_categories where event_id = p_event_id;

  for r in select * from public.stall_types where event_id = p_event_id loop
    insert into public.stall_types (
      event_id, size_type, monopoly_type, label, width_ft, length_ft, price_paise,
      advance_kind, advance_value, is_negotiable, min_price_paise, max_discount_pct
    ) values (
      v_new_id, r.size_type, r.monopoly_type, r.label, r.width_ft, r.length_ft, r.price_paise,
      r.advance_kind, r.advance_value, r.is_negotiable, r.min_price_paise, r.max_discount_pct
    ) returning id into v_new_type_id;
    v_type_map := v_type_map || jsonb_build_object(r.id::text, v_new_type_id::text);
  end loop;

  insert into public.stalls (
    event_id, stall_type_id, stall_number, preset_category_id,
    status, map_x, map_y, map_w, map_h, map_rotation, notes
  )
  select
    v_new_id, (v_type_map ->> stall_type_id::text)::uuid, stall_number, preset_category_id,
    'available', map_x, map_y, map_w, map_h, map_rotation, notes
  from public.stalls where event_id = p_event_id;

  perform public.write_audit_log('event.duplicate', 'events', v_new_id, null,
    jsonb_build_object('source_event_id', p_event_id));

  return v_new_id;
end;
$$;

grant execute on function public.duplicate_event(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- duplicate_stall_layout() — copy just the stall inventory from one
-- event to another (e.g. re-using a venue layout for a new date)
-- ---------------------------------------------------------------------
create or replace function public.duplicate_stall_layout(p_source_event_id uuid, p_target_event_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type_map jsonb := '{}'::jsonb;
  v_new_type_id uuid;
  r record;
  v_count int;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;

  for r in select * from public.stall_types where event_id = p_source_event_id loop
    insert into public.stall_types (
      event_id, size_type, monopoly_type, label, width_ft, length_ft, price_paise,
      advance_kind, advance_value, is_negotiable, min_price_paise, max_discount_pct
    ) values (
      p_target_event_id, r.size_type, r.monopoly_type, r.label, r.width_ft, r.length_ft, r.price_paise,
      r.advance_kind, r.advance_value, r.is_negotiable, r.min_price_paise, r.max_discount_pct
    )
    on conflict (event_id, size_type, monopoly_type) do update set price_paise = excluded.price_paise
    returning id into v_new_type_id;
    v_type_map := v_type_map || jsonb_build_object(r.id::text, v_new_type_id::text);
  end loop;

  insert into public.stalls (event_id, stall_type_id, stall_number, preset_category_id, status, map_x, map_y, map_w, map_h, map_rotation, notes)
  select p_target_event_id, (v_type_map ->> stall_type_id::text)::uuid, stall_number, preset_category_id,
    'available', map_x, map_y, map_w, map_h, map_rotation, notes
  from public.stalls where event_id = p_source_event_id;

  get diagnostics v_count = row_count;
  perform public.write_audit_log('event.duplicate_stall_layout', 'events', p_target_event_id, null,
    jsonb_build_object('source_event_id', p_source_event_id, 'stalls_copied', v_count));
  return v_count;
end;
$$;

grant execute on function public.duplicate_stall_layout(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- duplicate_coupon() — new id, new code, starts inactive/draft, no
-- usage history
-- ---------------------------------------------------------------------
create or replace function public.duplicate_coupon(p_coupon_id uuid, p_new_code text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.coupons;
  v_new_id uuid;
  v_code citext;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;

  select * into c from public.coupons where id = p_coupon_id;
  if c.id is null then raise exception 'COUPON_NOT_FOUND' using errcode = 'P0001'; end if;

  v_code := coalesce(p_new_code, c.code || '-COPY-' || substr(gen_random_uuid()::text, 1, 4))::citext;

  insert into public.coupons (
    code, description, kind, value, event_id, category_id, stall_id,
    min_amount_paise, max_discount_paise, starts_at, ends_at, usage_limit, per_user_limit,
    is_stackable_with_discounts, is_active, is_draft, duplicated_from_id, created_by
  ) values (
    v_code, c.description, c.kind, c.value, c.event_id, c.category_id, c.stall_id,
    c.min_amount_paise, c.max_discount_paise, c.starts_at, c.ends_at, c.usage_limit, c.per_user_limit,
    c.is_stackable_with_discounts, false, true, c.id, auth.uid()
  ) returning id into v_new_id;

  perform public.write_audit_log('coupon.duplicate', 'coupons', v_new_id, null, jsonb_build_object('source_coupon_id', p_coupon_id));
  return v_new_id;
end;
$$;

grant execute on function public.duplicate_coupon(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- bulk_generate_stalls() — quickly populate an event's stall inventory
-- ---------------------------------------------------------------------
create or replace function public.bulk_generate_stalls(
  p_event_id uuid, p_stall_type_id uuid, p_prefix text, p_start int, p_count int
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
  for i in 0 .. p_count - 1 loop
    insert into public.stalls (event_id, stall_type_id, stall_number, map_x, map_y, map_w, map_h)
    values (
      p_event_id, p_stall_type_id, p_prefix || lpad((p_start + i)::text, 2, '0'),
      (i % 8), (i / 8), 1, 1
    )
    on conflict (event_id, stall_number) do nothing;
  end loop;
  perform public.write_audit_log('stalls.bulk_generate', 'events', p_event_id, null,
    jsonb_build_object('prefix', p_prefix, 'count', p_count));
  return p_count;
end;
$$;

grant execute on function public.bulk_generate_stalls(uuid, uuid, text, int, int) to authenticated;
