-- Functional smoke test — exercises reservation locking, monopoly
-- enforcement, pricing, coupons, payments, negotiation. Run locally only.

\set ON_ERROR_STOP on
\pset pager off

-- ---- seed two auth users + profiles -----------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'vendor-a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'vendor-b@example.com'),
  ('99999999-9999-9999-9999-999999999999', 'admin@example.com');

insert into public.profiles (id, full_name, email, mobile, profile_complete)
values
  ('11111111-1111-1111-1111-111111111111', 'Vendor A', 'vendor-a@example.com', '9000000001', true),
  ('22222222-2222-2222-2222-222222222222', 'Vendor B', 'vendor-b@example.com', '9000000002', true),
  ('99999999-9999-9999-9999-999999999999', 'Admin', 'admin@example.com', '9000000099', true)
on conflict (id) do nothing;

select public.bootstrap_first_admin('admin@example.com');

-- ---- event + stall types + stalls --------------------------------------
insert into public.events (id, name, slug, event_date, status, reservation_minutes, max_stalls_per_user)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Bengaluru Flea Market', 'blr-flea', '2026-10-25', 'registration_open', 10, 5);

select id as jewellery_cat_id from public.categories where slug = 'jewellery' \gset
insert into public.event_categories (event_id, category_id, monopoly_scope)
values ('aaaaaaaa-0000-0000-0000-000000000001', :'jewellery_cat_id', 'event_category');

insert into public.stall_types (id, event_id, size_type, monopoly_type, width_ft, length_ft, price_paise, advance_kind, advance_value, is_negotiable, min_price_paise)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'half', 'monopoly', 3, 6, 750000, 'percentage', 20, true, 500000),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'half', 'non_monopoly', 3, 6, 500000, 'percentage', 20, true, 300000);

insert into public.stalls (id, event_id, stall_type_id, stall_number)
values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'A01'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'A02'),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'A03');

\echo '--- TEST 1: Vendor A reserves stall A01 as monopoly Jewellery ---'
select set_config('request.jwt.uid', '11111111-1111-1111-1111-111111111111', false);
select * from public.reserve_stall('cccccccc-0000-0000-0000-000000000001', :'jewellery_cat_id');

\echo '--- TEST 2: Vendor B tries to reserve the SAME stall A01 -> must fail (expect an ERROR below) ---'
select set_config('request.jwt.uid', '22222222-2222-2222-2222-222222222222', false);
\set ON_ERROR_STOP off
select public.reserve_stall('cccccccc-0000-0000-0000-000000000001', null);
\set ON_ERROR_STOP on
select count(*) as should_be_1_active_reservation_owned_by_vendor_a
  from public.stall_reservations
  where stall_id = 'cccccccc-0000-0000-0000-000000000001' and status = 'active'
    and user_id = '11111111-1111-1111-1111-111111111111';

\echo '--- TEST 3: Vendor B tries a DIFFERENT stall (A02) as monopoly Jewellery -> must fail (expect an ERROR below) ---'
\set ON_ERROR_STOP off
select public.reserve_stall('cccccccc-0000-0000-0000-000000000002', :'jewellery_cat_id');
\set ON_ERROR_STOP on
select status from public.stalls where id = 'cccccccc-0000-0000-0000-000000000002';

\echo '--- TEST 4: Vendor B books the NON-monopoly stall (A03) fine ---'
select * from public.reserve_stall('cccccccc-0000-0000-0000-000000000003', :'jewellery_cat_id');

\echo '--- TEST 5: price breakdown for Vendor A on A01 (no coupon) ---'
select set_config('request.jwt.uid', '11111111-1111-1111-1111-111111111111', false);
select public.compute_price_breakdown('cccccccc-0000-0000-0000-000000000001', :'jewellery_cat_id', null, null);

\echo '--- TEST 6: create a coupon + apply it ---'
select set_config('request.jwt.uid', '99999999-9999-9999-9999-999999999999', false);
insert into public.coupons (code, kind, value, is_active) values ('FLEA500', 'fixed', 50000, true);
select set_config('request.jwt.uid', '11111111-1111-1111-1111-111111111111', false);
select public.compute_price_breakdown('cccccccc-0000-0000-0000-000000000001', :'jewellery_cat_id', 'FLEA500', null);

\echo '--- TEST 7: convert reservation to booking with coupon ---'
select id as res_a_id from public.stall_reservations where stall_id = 'cccccccc-0000-0000-0000-000000000001' and status = 'active' \gset
select * from public.convert_reservation_to_booking(:'res_a_id', null, 'FLEA500');

\echo '--- TEST 8: submit + verify payment for the advance, watch status flip ---'
select id as alloc_a_id, required_advance_paise from public.stall_allocations where stall_id = 'cccccccc-0000-0000-0000-000000000001' \gset
select public.submit_payment('stall_advance', :required_advance_paise, 'upi', :'alloc_a_id', null, 'UTR123456');
select id as pay_a_id from public.payments where allocation_id = :'alloc_a_id' \gset
select set_config('request.jwt.uid', '99999999-9999-9999-9999-999999999999', false);
select public.verify_payment(:'pay_a_id');
select status, required_advance_paise, final_price_paise from public.stall_allocations where id = :'alloc_a_id';

\echo '--- TEST 9: admin approves booking -> stall becomes confirmed ---'
select public.approve_booking(:'alloc_a_id');
select s.status as stall_status, a.status as booking_status from public.stalls s
  join public.stall_allocations a on a.stall_id = s.id where a.id = :'alloc_a_id';

\echo '--- TEST 10: negotiation flow on Vendor B non-monopoly stall ---'
select id as alloc_b_id from public.stall_reservations where stall_id = 'cccccccc-0000-0000-0000-000000000003' and status = 'active' \gset
select set_config('request.jwt.uid', '22222222-2222-2222-2222-222222222222', false);
select * from public.convert_reservation_to_booking(:'alloc_b_id', null, null);
select id as alloc_b_id2 from public.stall_allocations where stall_id = 'cccccccc-0000-0000-0000-000000000003' \gset
select public.request_negotiation(:'alloc_b_id2', 400000, 'Can you do 4000?');
select id as neg_id from public.negotiation_requests where allocation_id = :'alloc_b_id2' \gset
select set_config('request.jwt.uid', '99999999-9999-9999-9999-999999999999', false);
select public.admin_negotiation_action(:'neg_id', 'counter', 450000, 'Meet at 4500?');
select set_config('request.jwt.uid', '22222222-2222-2222-2222-222222222222', false);
select public.user_negotiation_action(:'neg_id', 'accept', null, 'Deal!');
select status, negotiated_price_paise, final_price_paise, required_advance_paise from public.stall_allocations where id = :'alloc_b_id2';

\echo '--- TEST 11: reservation expiry sweep (simulate time travel) ---'
insert into public.stalls (id, event_id, stall_type_id, stall_number)
  values ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'A04');
select set_config('request.jwt.uid', '11111111-1111-1111-1111-111111111111', false);
select * from public.reserve_stall('cccccccc-0000-0000-0000-000000000004', null);
update public.stall_reservations set expires_at = now() - interval '1 minute' where stall_id = 'cccccccc-0000-0000-0000-000000000004';
select public.release_expired_reservations();
select status from public.stalls where id = 'cccccccc-0000-0000-0000-000000000004';

\echo 'ALL SMOKE TESTS COMPLETED';
