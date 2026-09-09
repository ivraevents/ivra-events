-- Aggregate-only public stat used by the Home screen's "trust strip"
-- (Stalls / Verified Customers / Stalls Booked). The `registrations` table
-- itself is select-own only (see 0019_rls_policies.sql), so a regular
-- user's client can't count across everyone's rows — this SECURITY DEFINER
-- function returns just the one aggregate number, never any row data, so
-- it's safe to expose to any signed-in user.
create or replace function public.get_verified_customer_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(count(distinct user_id), 0)::int
  from public.registrations
  where status = 'approved';
$$;

grant execute on function public.get_verified_customer_count() to authenticated;
