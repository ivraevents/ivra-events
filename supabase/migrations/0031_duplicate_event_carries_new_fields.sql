-- =====================================================================
-- Migration 0031: duplicate_event() carries over the new event fields
-- Without this, "Duplicate" on an Unfixed event silently produced a
-- Fixed-mode copy (stall_mode defaults to 'fixed'), hiding the copy's
-- Half/Full price fields and total capacity even though the underlying
-- stall_types rows were still copied — confusing and easy to miss. Also
-- carries over banner_url/maps_url/expected_crowd, which the original
-- duplicate_event() (0023) never copied either.
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
    name, slug, description, banner_url, venue, address, city, event_date, end_date,
    start_time, end_time, registration_start_at, registration_end_at,
    status, terms_and_conditions, allow_multiple_stalls, max_stalls_per_user,
    reservation_minutes, application_fee_paise, negotiation_enabled,
    maps_url, expected_crowd, stall_mode, total_stall_capacity, full_stall_unit_ratio,
    duplicated_from_event_id, created_by
  ) values (
    v_old.name || ' (Copy)', v_old.slug || '-copy-' || substr(gen_random_uuid()::text, 1, 6),
    v_old.description, v_old.banner_url, v_old.venue, v_old.address, v_old.city, v_old.event_date, v_old.end_date,
    v_old.start_time, v_old.end_time, null, null,
    'draft', v_old.terms_and_conditions, v_old.allow_multiple_stalls, v_old.max_stalls_per_user,
    v_old.reservation_minutes, v_old.application_fee_paise, v_old.negotiation_enabled,
    v_old.maps_url, v_old.expected_crowd, v_old.stall_mode, v_old.total_stall_capacity, v_old.full_stall_unit_ratio,
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

  -- Fixed-mode events: copy the exact numbered stall layout, as before.
  -- Unfixed-mode events: skip this — their stalls are minted on demand
  -- (see reserve_open_stall in 0030), so a fresh copy should start with
  -- zero minted stalls against its (also-copied) total capacity, not a
  -- duplicate set of already-numbered slots left over from the source.
  if v_old.stall_mode = 'fixed' then
    insert into public.stalls (
      event_id, stall_type_id, stall_number, preset_category_id,
      status, map_x, map_y, map_w, map_h, map_rotation, notes
    )
    select
      v_new_id, (v_type_map ->> stall_type_id::text)::uuid, stall_number, preset_category_id,
      'available', map_x, map_y, map_w, map_h, map_rotation, notes
    from public.stalls where event_id = p_event_id;
  end if;

  perform public.write_audit_log('event.duplicate', 'events', v_new_id, null,
    jsonb_build_object('source_event_id', p_event_id));

  return v_new_id;
end;
$$;
