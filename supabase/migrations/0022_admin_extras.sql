-- =====================================================================
-- Migration 0022: Small admin-oversight additions found while building
-- the admin dashboard.
-- =====================================================================

-- Admins can see all notifications (oversight / "did this actually fire"
-- debugging) — regular users still only ever see their own.
create policy notifications_admin_read on public.notifications
  for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- admin_kpis() — one round trip for the whole admin dashboard, computed
-- server-side so the counts always match the RLS-protected data.
-- ---------------------------------------------------------------------
create or replace function public.admin_kpis()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;

  return jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'vendors', (select count(distinct user_id) from public.user_roles where role_key = 'vendor'),
    'pending_registrations', (select count(*) from public.registrations where status in ('submitted','under_review')),
    'approved_registrations', (select count(*) from public.registrations where status = 'approved'),
    'documents_pending', (select count(*) from public.documents where status in ('pending','reupload_requested')),
    'pending_payments', (select count(*) from public.payments where status = 'pending_verification'),
    'total_revenue_paise', (select coalesce(sum(amount_paise),0) from public.payments where status = 'verified'),
    'outstanding_balance_paise', (select coalesce(sum(final_price_paise - (
        select coalesce(sum(pa.amount_paise),0) from public.payment_allocations pa
        join public.payments p on p.id = pa.payment_id where p.allocation_id = a.id and p.status='verified'
      )),0) from public.stall_allocations a where a.status in ('balance_pending','pending_approval','confirmed')),
    'stalls_available', (select count(*) from public.stalls where status = 'available'),
    'stalls_reserved', (select count(*) from public.stalls where status = 'reserved'),
    'stalls_confirmed', (select count(*) from public.stalls where status = 'confirmed'),
    'stalls_occupied', (select count(*) from public.stalls where status = 'occupied'),
    'pending_negotiations', (select count(*) from public.negotiation_requests where status in ('pending','countered')),
    'open_tickets', (select count(*) from public.support_tickets where status in ('open','in_progress','waiting_for_user')),
    'stall_type_matrix', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
        select st.size_type, st.monopoly_type,
          count(s.id) as total,
          count(s.id) filter (where s.status <> 'available') as booked,
          count(s.id) filter (where s.status = 'available') as available
        from public.stall_types st
        left join public.stalls s on s.stall_type_id = st.id
        group by st.size_type, st.monopoly_type
      ) t
    )
  );
end;
$$;

grant execute on function public.admin_kpis() to authenticated;
