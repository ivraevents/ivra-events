-- =====================================================================
-- Migration 0029: Event Google Maps link + expected crowd
-- Two small additive fields on events, requested so customers can get
-- Google Maps directions to a market and see an expected-footfall note.
-- Both are plain optional text: maps_url so the admin can just paste
-- whatever link Google Maps gives them (a share link, not raw
-- coordinates), and expected_crowd as free text so a non-technical
-- admin can describe it in their own words ("2000+", "Large turnout
-- expected") instead of being forced into a rigid number field.
-- Occupied-vs-total stalls needs no new column — it's already derived
-- from the stalls table (see event_listing_v below), same as
-- available_stalls always has been.
-- =====================================================================

alter table public.events
  add column maps_url text,
  add column expected_crowd text;

-- Refresh the public listing view so these two new fields read the same
-- way banner_url etc. already do.
create or replace view public.event_listing_v as
select
  e.id, e.name, e.slug, e.description, e.banner_url, e.venue, e.address, e.city,
  e.maps_url, e.expected_crowd,
  e.event_date, e.end_date, e.start_time, e.end_time, e.status,
  e.registration_start_at, e.registration_end_at,
  count(s.id) as total_stalls,
  count(s.id) filter (where s.status = 'available') as available_stalls,
  min(public.stall_effective_price(s.id)) as starting_price_paise
from public.events e
left join public.stalls s on s.event_id = e.id
group by e.id;
