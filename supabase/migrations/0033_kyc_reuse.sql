-- =====================================================================
-- Migration 0033: Reusable KYC (Aadhaar/PAN) across bookings & registrations
--
-- Until now, every document uploaded via upload_document_version() was
-- scoped to (user_id, kind, registration_id) — so a customer who already
-- had an approved Aadhaar from a previous stall booking was still forced
-- to upload it again for every new booking or canopy/game registration,
-- because each of those creates a brand new `registrations` row.
--
-- documents.registration_id was already nullable (see 0007) — this
-- migration doesn't need to change the schema at all. The fix is simply:
-- going forward, the app calls upload_document_version() with
-- p_registration_id = null for identity documents (aadhaar_front,
-- aadhaar_back, pan), so there is exactly ONE documents row per
-- (user_id, kind) that every booking/registration flow shares and
-- reuses, instead of a fresh row per registration. Re-uploads (e.g.
-- after an admin requests one) still work exactly as before — they just
-- bump the version on that same shared row.
--
-- get_my_kyc_status() below is what the app calls to decide, per user,
-- whether to show the upload step at all or skip straight past it:
--   - no row yet, or status = 'reupload_requested' → must (re)upload
--   - status = 'pending' or 'approved' → already on file, skip upload
-- Existing documents uploaded before this migration stay tied to their
-- original registration_id, so a user's very next booking/registration
-- after this ships will ask for Aadhaar one last time — from then on
-- it's on file for good (or until an admin asks for a re-upload).
-- =====================================================================

create or replace function public.get_my_kyc_status()
returns table (
  aadhaar_front_status public.document_status,
  aadhaar_back_status public.document_status,
  pan_status public.document_status
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select d.status from public.documents d
       where d.user_id = auth.uid() and d.kind = 'aadhaar_front' and d.registration_id is null),
    (select d.status from public.documents d
       where d.user_id = auth.uid() and d.kind = 'aadhaar_back' and d.registration_id is null),
    (select d.status from public.documents d
       where d.user_id = auth.uid() and d.kind = 'pan' and d.registration_id is null);
$$;

grant execute on function public.get_my_kyc_status() to authenticated;
