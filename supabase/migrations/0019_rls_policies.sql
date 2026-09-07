-- =====================================================================
-- Migration 0019: Row Level Security — enabled on every table.
--
-- Design: almost all WRITES happen through the SECURITY DEFINER
-- functions in migrations 0015-0018 (owned by the migration role, which
-- also owns the tables, so those functions transparently bypass RLS —
-- standard Supabase pattern). The policies below therefore mostly govern
-- SELECT visibility, plus a small number of direct-insert cases
-- (drafting a registration, uploading a document is done via RPC only,
-- creating a support ticket/message) that are safe for a user to do
-- directly under `user_id = auth.uid()`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_support_staff());

create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- roles / user_roles
-- ---------------------------------------------------------------------
alter table public.roles enable row level security;
create policy roles_read_all on public.roles for select using (true);

alter table public.user_roles enable row level security;
create policy user_roles_select_own on public.user_roles
  for select using (user_id = auth.uid() or public.is_admin());
create policy user_roles_admin_write on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- categories — public read, admin write
-- ---------------------------------------------------------------------
alter table public.categories enable row level security;
create policy categories_read_all on public.categories for select using (true);
create policy categories_admin_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- events / event_categories — public read of non-draft events
-- ---------------------------------------------------------------------
alter table public.events enable row level security;
create policy events_read_public on public.events
  for select using (status <> 'draft' or public.is_admin() or public.is_support_staff());
create policy events_admin_write on public.events
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.event_categories enable row level security;
create policy event_categories_read on public.event_categories
  for select using (true);
create policy event_categories_admin_write on public.event_categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- stall_types / stalls — public read (needed for the stall map)
-- ---------------------------------------------------------------------
alter table public.stall_types enable row level security;
create policy stall_types_read on public.stall_types for select using (true);
create policy stall_types_admin_write on public.stall_types
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.stall_price_history enable row level security;
create policy stall_price_history_admin_read on public.stall_price_history
  for select using (public.is_admin());

alter table public.stalls enable row level security;
create policy stalls_read on public.stalls for select using (true);
create policy stalls_admin_write on public.stalls
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- stall_reservations — own rows only; writes via RPC (reserve_stall,
-- cancel_reservation) which run SECURITY DEFINER and bypass these
-- policies, so no direct insert/update policy is granted here.
-- ---------------------------------------------------------------------
alter table public.stall_reservations enable row level security;
create policy stall_reservations_select_own on public.stall_reservations
  for select using (user_id = auth.uid() or public.is_admin() or public.is_support_staff());

-- ---------------------------------------------------------------------
-- stall_allocations (bookings) — own rows only; all writes via RPC
-- ---------------------------------------------------------------------
alter table public.stall_allocations enable row level security;
create policy stall_allocations_select_own on public.stall_allocations
  for select using (user_id = auth.uid() or public.is_admin() or public.is_support_staff());

-- ---------------------------------------------------------------------
-- registrations + type-specific detail tables
-- Users may INSERT/UPDATE their own DRAFT registration directly (the
-- detailed form autosaves); once submitted, only admin (via review flow)
-- can change status. Server functions still gate document approval etc.
-- ---------------------------------------------------------------------
alter table public.registrations enable row level security;
create policy registrations_select_own on public.registrations
  for select using (user_id = auth.uid() or public.is_admin() or public.is_support_staff());
create policy registrations_insert_own on public.registrations
  for insert with check (user_id = auth.uid());
create policy registrations_update_own_draft on public.registrations
  for update using (user_id = auth.uid() and status in ('draft','changes_requested'))
  with check (user_id = auth.uid());
create policy registrations_admin_write on public.registrations
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.vendor_registrations enable row level security;
create policy vendor_registrations_owner on public.vendor_registrations
  for all using (
    exists (select 1 from public.registrations r where r.id = registration_id
      and (r.user_id = auth.uid() or public.is_admin() or public.is_support_staff()))
  ) with check (
    exists (select 1 from public.registrations r where r.id = registration_id
      and r.user_id = auth.uid() and r.status in ('draft','changes_requested'))
    or public.is_admin()
  );

alter table public.canopy_registrations enable row level security;
create policy canopy_registrations_owner on public.canopy_registrations
  for all using (
    exists (select 1 from public.registrations r where r.id = registration_id
      and (r.user_id = auth.uid() or public.is_admin() or public.is_support_staff()))
  ) with check (
    exists (select 1 from public.registrations r where r.id = registration_id
      and r.user_id = auth.uid() and r.status in ('draft','changes_requested'))
    or public.is_admin()
  );

alter table public.game_registrations enable row level security;
create policy game_registrations_owner on public.game_registrations
  for all using (
    exists (select 1 from public.registrations r where r.id = registration_id
      and (r.user_id = auth.uid() or public.is_admin() or public.is_support_staff()))
  ) with check (
    exists (select 1 from public.registrations r where r.id = registration_id
      and r.user_id = auth.uid() and r.status in ('draft','changes_requested'))
    or public.is_admin()
  );

-- ---------------------------------------------------------------------
-- documents / document_versions — strictly own; review via RPC only.
-- Support agents are deliberately excluded (Aadhaar/PAN are off-limits
-- to support staff per spec #46) — only admin + the owner may see them.
-- ---------------------------------------------------------------------
alter table public.documents enable row level security;
create policy documents_select_own on public.documents
  for select using (user_id = auth.uid() or public.is_admin());

alter table public.document_versions enable row level security;
create policy document_versions_select_own on public.document_versions
  for select using (
    exists (select 1 from public.documents d where d.id = document_id
      and (d.user_id = auth.uid() or public.is_admin()))
  );

-- ---------------------------------------------------------------------
-- discounts / discount_usages / coupons / coupon_usages — admin only.
-- Regular users never see these tables directly; they interact only via
-- compute_price_breakdown()/validate_coupon() RPCs.
-- ---------------------------------------------------------------------
alter table public.discounts enable row level security;
create policy discounts_admin_all on public.discounts
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.discount_usages enable row level security;
create policy discount_usages_admin_read on public.discount_usages
  for select using (public.is_admin() or user_id = auth.uid());

alter table public.coupons enable row level security;
create policy coupons_admin_all on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.coupon_usages enable row level security;
create policy coupon_usages_read on public.coupon_usages
  for select using (public.is_admin() or user_id = auth.uid());

-- ---------------------------------------------------------------------
-- negotiations — own + admin; all mutation via RPC
-- ---------------------------------------------------------------------
alter table public.negotiation_requests enable row level security;
create policy negotiation_requests_select on public.negotiation_requests
  for select using (user_id = auth.uid() or public.is_admin() or public.is_support_staff());

alter table public.negotiation_offers enable row level security;
create policy negotiation_offers_select on public.negotiation_offers
  for select using (
    exists (select 1 from public.negotiation_requests n where n.id = negotiation_id
      and (n.user_id = auth.uid() or public.is_admin() or public.is_support_staff()))
  );

alter table public.negotiation_rules enable row level security;
create policy negotiation_rules_read on public.negotiation_rules for select using (true);
create policy negotiation_rules_admin_write on public.negotiation_rules
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- payments / payment_allocations / adjustments / refunds
-- Users may INSERT their own payment claim only via submit_payment()
-- (SECURITY DEFINER — bypasses RLS); direct table writes are blocked.
-- ---------------------------------------------------------------------
alter table public.payments enable row level security;
create policy payments_select_own on public.payments
  for select using (user_id = auth.uid() or public.is_admin() or public.is_support_staff());

alter table public.payment_allocations enable row level security;
create policy payment_allocations_select on public.payment_allocations
  for select using (
    public.is_admin() or exists (
      select 1 from public.payments p where p.id = payment_id and p.user_id = auth.uid()
    )
  );

alter table public.adjustments enable row level security;
create policy adjustments_select on public.adjustments
  for select using (
    public.is_admin() or exists (
      select 1 from public.stall_allocations a where a.id = allocation_id and a.user_id = auth.uid()
    )
  );

alter table public.refunds enable row level security;
create policy refunds_select on public.refunds
  for select using (
    public.is_admin() or exists (
      select 1 from public.payments p where p.id = payment_id and p.user_id = auth.uid()
    )
  );
create policy refunds_admin_write on public.refunds
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- invoices / invoice_items — own + admin, read only (generated via RPC)
-- ---------------------------------------------------------------------
alter table public.invoices enable row level security;
create policy invoices_select_own on public.invoices
  for select using (user_id = auth.uid() or public.is_admin());

alter table public.invoice_items enable row level security;
create policy invoice_items_select on public.invoice_items
  for select using (
    exists (select 1 from public.invoices i where i.id = invoice_id
      and (i.user_id = auth.uid() or public.is_admin()))
  );

-- ---------------------------------------------------------------------
-- support — user owns their ticket; support staff (admin/manager/agent)
-- can see and reply to all tickets
-- ---------------------------------------------------------------------
alter table public.support_tickets enable row level security;
create policy support_tickets_select on public.support_tickets
  for select using (user_id = auth.uid() or public.is_support_staff());
create policy support_tickets_insert_own on public.support_tickets
  for insert with check (user_id = auth.uid());
create policy support_tickets_update on public.support_tickets
  for update using (user_id = auth.uid() or public.is_support_staff())
  with check (user_id = auth.uid() or public.is_support_staff());

alter table public.support_messages enable row level security;
create policy support_messages_select on public.support_messages
  for select using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id
      and (t.user_id = auth.uid() or public.is_support_staff()))
  );
create policy support_messages_insert on public.support_messages
  for insert with check (
    sender_id = auth.uid() and exists (
      select 1 from public.support_tickets t where t.id = ticket_id
        and (t.user_id = auth.uid() or public.is_support_staff())
    )
  );

alter table public.support_attachments enable row level security;
create policy support_attachments_select on public.support_attachments
  for select using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id
      and (t.user_id = auth.uid() or public.is_support_staff()))
  );
create policy support_attachments_insert on public.support_attachments
  for insert with check (
    uploaded_by = auth.uid() and exists (
      select 1 from public.support_tickets t where t.id = ticket_id
        and (t.user_id = auth.uid() or public.is_support_staff())
    )
  );

-- ---------------------------------------------------------------------
-- notifications — strictly own
-- ---------------------------------------------------------------------
alter table public.notifications enable row level security;
create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());
create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- audit_logs — admin only, insert-only via write_audit_log(); no update
-- or delete policy exists for ANY role, making the log immutable.
-- ---------------------------------------------------------------------
alter table public.audit_logs enable row level security;
create policy audit_logs_admin_read on public.audit_logs
  for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- system_settings — admin only (clients use get_public_settings() RPC)
-- ---------------------------------------------------------------------
alter table public.system_settings enable row level security;
create policy system_settings_admin_all on public.system_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- invoice_sequences — no client access at all; only next_invoice_number()
-- ---------------------------------------------------------------------
alter table public.invoice_sequences enable row level security;
