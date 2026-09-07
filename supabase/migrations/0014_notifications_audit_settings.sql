-- =====================================================================
-- Migration 0014: In-app Notifications, Audit Logs, System Settings
-- =====================================================================

create type public.notification_type as enum (
  'registration_approved', 'registration_rejected', 'document_reupload_required',
  'document_approved', 'payment_verified', 'stall_reserved', 'stall_reservation_expiring',
  'stall_confirmed', 'negotiation_submitted', 'negotiation_countered',
  'negotiation_approved', 'negotiation_rejected', 'coupon_applied',
  'invoice_generated', 'support_reply', 'support_status_changed', 'general'
);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        public.notification_type not null default 'general',
  title       text not null,
  body        text,
  link_path   text,          -- in-app route to deep-link to, e.g. /bookings/{id}
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index notifications_user_unread_idx on public.notifications (user_id, is_read, created_at desc);

-- ---------------------------------------------------------------------
-- audit_logs — immutable. Insert-only; no update/delete policies at all.
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references public.profiles(id),
  action        text not null,          -- e.g. 'stall.reserve', 'registration.approve'
  entity_type   text not null,          -- e.g. 'stall_allocations'
  entity_id     uuid,
  old_value     jsonb,
  new_value     jsonb,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

create or replace function public.write_audit_log(
  p_action text, p_entity_type text, p_entity_id uuid,
  p_old jsonb default null, p_new jsonb default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_old, p_new);
end;
$$;

-- ---------------------------------------------------------------------
-- system_settings — single-row key/value config, admin-editable
-- ---------------------------------------------------------------------
create table public.system_settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now()
);

insert into public.system_settings (key, value) values
  ('application_fee_paise', '9900'),
  ('default_reservation_minutes', '10'),
  ('default_max_stalls_per_user', '5'),
  ('negotiation_defaults', '{"max_counter_offers": 3, "offer_expiry_hours": 24, "monopoly_negotiable": false}'),
  ('refund_rules', '{"processing_days": 7, "requires_admin_approval": true}'),
  ('upi_details', '{"vpa": "", "payee_name": "", "notes": ""}'),
  ('business_details', '{"legal_name": "Navrathan Jewellers", "gstin": "", "pan": "", "address": ""}'),
  ('invoice_settings', '{"prefix": "IVRA", "default_type": "non_gst", "terms": ""}'),
  ('document_limits', '{"max_file_size_mb": 5, "allowed_types": ["image/jpeg", "image/png", "application/pdf"]}');

create trigger trg_system_settings_updated_at
  before update on public.system_settings
  for each row execute function public.set_updated_at();
