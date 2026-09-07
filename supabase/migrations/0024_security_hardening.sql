-- =====================================================================
-- Migration 0024: Function execution hardening
-- =====================================================================
-- PostgreSQL grants EXECUTE on every newly created function to PUBLIC
-- by default, which in Supabase means BOTH `anon` and `authenticated`
-- can call it directly via `supabase.rpc(...)` unless revoked. Several
-- internal-only helper functions created in earlier migrations never
-- had this default revoked, which means, until this migration:
--
--   * any authenticated user could call apply_negotiation_settlement()
--     directly to settle ANY OTHER USER's negotiation at ANY price,
--     completely bypassing admin_negotiation_action()'s approval flow
--     and the negotiation_rules (min price / max discount / etc).
--   * any authenticated (or anon) user could call notify() to spoof
--     arbitrary in-app notifications (title/body/link) at any user_id
--     — a phishing/spam vector.
--   * any authenticated user could call write_audit_log() to insert
--     forged rows into the supposedly-immutable audit trail.
--   * any authenticated user could call next_invoice_number() directly,
--     burning sequence numbers and creating gaps in invoice numbering
--     without ever generating an invoice.
--   * recompute_allocation_status() / assert_monopoly_available() and
--     the plain trigger functions were likewise callable directly,
--     though lower-risk since they only recompute derived state.
--
-- None of these were ever intended to be called by a client — they are
-- implementation details invoked only from within other SECURITY
-- DEFINER functions (which, executing as the function owner, retain
-- their own implicit EXECUTE rights regardless of what is revoked from
-- PUBLIC here). This migration revokes PUBLIC execute on all of them,
-- re-affirms the grants that legitimate client-facing RPCs and RLS
-- policy helper functions need, and sets a default so newly created
-- functions are private-by-default going forward.
-- ---------------------------------------------------------------------

-- Internal-only business-logic helpers: must never be reachable by a
-- direct RPC call from the frontend.
revoke execute on function public.notify(uuid, public.notification_type, text, text, text) from public;
revoke execute on function public.write_audit_log(text, text, uuid, jsonb, jsonb) from public;
revoke execute on function public.next_invoice_number(text) from public;
revoke execute on function public.apply_negotiation_settlement(uuid, bigint) from public;
revoke execute on function public.recompute_allocation_status(uuid) from public;
revoke execute on function public.assert_monopoly_available(uuid, uuid, uuid) from public;

-- Trigger-only functions: Postgres never checks EXECUTE privilege to
-- *fire* a trigger, so revoking these only closes off direct
-- `select public.fn()` invocation — the triggers themselves keep working.
revoke execute on function public.handle_new_auth_user() from public;
revoke execute on function public.grant_default_role() from public;
revoke execute on function public.sync_document_from_version() from public;
revoke execute on function public.touch_ticket_on_message() from public;
revoke execute on function public.log_stall_price_change() from public;
revoke execute on function public.set_updated_at() from public;

-- ---------------------------------------------------------------------
-- Re-affirm grants for the small set of read-only predicate helpers
-- that RLS policies and views legitimately evaluate on behalf of the
-- querying role (authenticated and, where the underlying policy has no
-- `to` clause and can be hit pre-login, anon too).
-- ---------------------------------------------------------------------
grant execute on function public.is_admin(uuid) to authenticated, anon;
grant execute on function public.is_support_staff(uuid) to authenticated, anon;
grant execute on function public.has_role(text, uuid) to authenticated, anon;
grant execute on function public.has_any_role(text[], uuid) to authenticated, anon;
grant execute on function public.current_user_id() to authenticated;
grant execute on function public.stall_effective_price(uuid) to authenticated, anon;
grant execute on function public.stall_is_negotiable(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Default privileges: any function created by this migration role from
-- now on starts private and must be explicitly granted, instead of
-- silently inheriting PUBLIC execute.
-- ---------------------------------------------------------------------
alter default privileges in schema public revoke execute on functions from public;
