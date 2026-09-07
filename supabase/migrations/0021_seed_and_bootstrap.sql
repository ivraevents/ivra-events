-- =====================================================================
-- Migration 0021: Seed defaults + one-time admin bootstrap
-- =====================================================================

-- Global default negotiation rules (event_id null = fallback for any
-- event that hasn't configured its own row)
insert into public.negotiation_rules (event_id, min_price_paise, max_discount_pct, max_counter_offers, offer_expiry_hours, monopoly_negotiable)
values (null, 0, 30, 3, 24, false)
on conflict (event_id) do nothing;

-- ---------------------------------------------------------------------
-- bootstrap_first_admin() — the ONLY way to create the first admin.
-- Self-locking: once a single admin exists, this permanently refuses to
-- run again, so it can never be used as a standing privilege-escalation
-- path. Run once, right after the founding account signs up:
--
--   select public.bootstrap_first_admin('online@navrathan.com');
-- ---------------------------------------------------------------------
create or replace function public.bootstrap_first_admin(p_email citext)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_admin_exists boolean;
begin
  select exists(select 1 from public.user_roles where role_key = 'admin') into v_admin_exists;
  if v_admin_exists then
    raise exception 'ADMIN_ALREADY_BOOTSTRAPPED: grant further admins via the admin panel' using errcode = 'P0001';
  end if;

  select id into v_user_id from public.profiles where email = p_email;
  if v_user_id is null then
    raise exception 'NO_PROFILE_FOR_EMAIL: the user must sign in at least once first' using errcode = 'P0001';
  end if;

  insert into public.user_roles (user_id, role_key) values (v_user_id, 'admin')
  on conflict do nothing;

  perform public.write_audit_log('admin.bootstrap', 'user_roles', v_user_id);
end;
$$;

-- Intentionally NOT granted to authenticated/anon — must be run from the
-- Supabase SQL editor (or via the service role) by whoever controls the
-- project, exactly once.
