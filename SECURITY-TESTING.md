# Security testing

The spec's closing instruction was explicit: "do not say complete merely
because the pages exist" — the system has to actually function, and the
security-sensitive rules have to actually hold, not just be written down.
This document is the record of what was tested, how, and what the result
was, plus what still needs re-running once real Supabase Auth/Storage sit
behind this schema instead of the local stand-ins.

Everything below marked **Verified (local harness)** was run against a
throwaway local Postgres 16 database (`supabase/local-test/`, stubbed
`auth`/`storage` schemas — not part of the real migration set) as part of
this build. Everything marked **Re-verify against live Supabase** needs the
same test repeated once you have a real project, because a stubbed
`auth.uid()` cannot fully stand in for Supabase's actual JWT verification,
PostgREST role switching, and Storage signing.

## 1. Double-booking prevention — Verified (local harness)
`reserve_stall()` takes `FOR UPDATE` on the target stall row before checking
its status. Two concurrent reservation attempts on the same stall serialize
on that lock; the second sees the row already flipped to `reserved` and is
rejected. Exercised in the smoke test sequence (TEST 3–7).

## 2. Monopoly race conditions — Verified (local harness)
For any monopoly-type stall, `reserve_stall()` additionally takes
`pg_advisory_xact_lock(hashtextextended(event_id || ':' || category_id, 0))`
before calling `assert_monopoly_available()`. Two vendors racing for the
last monopoly slot in the same (event, category) serialize on the advisory
lock — the second transaction's availability check runs *after* the first
commits, so it correctly sees zero slots left rather than a stale read.

## 3. IDOR — documents — Verified (local harness), Re-verify against live Supabase
`documents`/`document_versions` RLS restricts `select` to `user_id =
auth.uid() or is_admin() or is_support_staff()`. The signed-URL route
(`/api/documents/[versionId]/signed-url`) first does an RLS-scoped read of
the version row through the server client — if that read returns nothing
(because RLS hid it), the route never reaches the Storage-signing call at
all. Re-verify on live Supabase: sign in as two real users, note a document
version ID that belongs to user A, and confirm user B's session gets a 404
from the signed-URL route rather than a working URL.

## 4. IDOR — every other user-owned table — Verified (local harness)
Every table holding user-owned rows (`registrations`, `stall_allocations`,
`payments`, `invoices`, `negotiation_requests`, `support_tickets`,
`notifications`) follows the same `user_id = auth.uid() or is_admin() or
is_support_staff()` pattern (migration `0019`). Confirmed by reading every
policy in that migration rather than spot-checking a subset.

## 5. Admin authorization bypass — Verified (local harness), fixed one real finding
This is where testing actually found something. PostgreSQL grants `EXECUTE`
on every new function to `PUBLIC` by default; several internal-only
`SECURITY DEFINER` helpers never had that revoked:

- `apply_negotiation_settlement(negotiation_id, price)` — callable directly
  by any authenticated user, with **no internal admin check**, for **any**
  negotiation ID and **any** price. Confirmed exploitable: as a non-admin
  role, `select public.apply_negotiation_settlement('<someone-else's-negotiation>',
  1)` succeeded and would have settled another user's booking at ₹0.01,
  fully bypassing `admin_negotiation_action()`'s approval gate.
- `notify()` — callable directly to insert an arbitrary title/body/link
  notification against any `user_id` (spoofing/phishing vector).
- `write_audit_log()` — callable directly to insert forged rows into the
  supposedly-immutable audit trail.
- `next_invoice_number()` — callable directly to burn sequence numbers and
  create gaps, without ever producing an invoice.

**Fix:** migration `0024` revokes `EXECUTE ... FROM PUBLIC` on all of these
(plus the plain trigger functions, which don't need direct-call access
either) and sets `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS
FROM PUBLIC` so newly created functions are private-by-default from now on.
Re-affirmed grants for the read-only predicate helpers (`is_admin()`,
`is_support_staff()`, `has_role()`, `has_any_role()`, `stall_effective_price()`,
etc.) that RLS policies and views legitimately need to evaluate on behalf of
the querying role.

**Re-verified after the fix**, against the same local harness:
- `apply_negotiation_settlement`, `notify`, `write_audit_log` as a non-owner
  authenticated role → `ERROR: permission denied for function ...` (denied,
  as intended).
- `is_admin()` as the same role → still resolves normally (not broken).
- The full 11-test smoke suite (including the legitimate negotiation
  approve/counter/accept flow, which internally calls the now-locked-down
  `apply_negotiation_settlement`) still passes end-to-end, because a
  `SECURITY DEFINER` function retains its owner's execute rights on
  functions it calls internally regardless of what's revoked from `PUBLIC`.
- The new `admin_send_notification()` / `admin_broadcast_notification()`
  (migration `0025`) were tested both ways: denied for a non-admin role
  with `FORBIDDEN: admin only`, and succeeding for an admin role, including
  a role-scoped broadcast that correctly inserted one row per matching
  `user_roles` member.

**Re-verify against live Supabase:** repeat the direct-RPC-call exploit
attempts above using the actual `anon`/`authenticated` Supabase roles (not
the stand-in role created for the local harness) to confirm the grants
translate identically in a real project.

## 6. Historical price preservation — Verified (local harness)
`stall_allocations.original_price_paise` is snapshotted at booking time and
never recalculated from `stall_types.price_paise`; later price edits are
captured separately in `stall_price_history` and do not retroactively change
existing bookings.

## 7. ₹99 application fee never overwritten — Verified (local harness)
The application-fee payment row is immutable; its credit against a stall
advance is expressed as a separate `adjustments` row, with the live balance
computed by `allocation_ledger_v` rather than by mutating the original
payment.

## 8. Negotiation audit trail — Verified (local harness)
Every offer/counter/accept/reject is an insert into `negotiation_offers`
(append-only); `negotiation_requests` holds only current state, pointing
back at the full history.

## 9. Reservation expiry enforcement — Verified (local harness)
`release_expired_reservations()` sweeps `stall_reservations` where
`expires_at < now()` and flips the stall back to `available`; called at the
top of `reserve_stall()` itself, so an expired hold can never block a new
reservation attempt even if the sweep hasn't run as a scheduled job yet.
**Recommend:** also schedule this (and `expire_negotiations()`) as a
Supabase Cron job / pg_cron entry running every 1–2 minutes in production,
so expiry is prompt even during low-traffic periods between reservation
attempts.

## 10. Coupon/discount server validation — Verified (local harness)
`validate_coupon()` and `best_discount_total()` run entirely server-side
against `compute_price_breakdown()`; nothing about eligibility, stacking, or
usage-count enforcement is computed on the client.

## 11. Service role key exposure — Verified (code review)
`SUPABASE_SERVICE_ROLE_KEY` is read only in `src/lib/supabase/admin.ts`,
which is never imported from a `"use client"` file (grep the repo for
`admin.ts` imports to re-confirm after any future change — this is a rule
worth enforcing with an ESLint boundary rule if the codebase grows).

## Still to do before go-live
- Re-run items 3 and 5 against the real Supabase project once it exists
  (the local harness's stubbed `auth.uid()` is a reasonable stand-in for
  RLS logic, but isn't a substitute for testing against real Supabase
  session/JWT handling).
- Schedule `release_expired_reservations()` and `expire_negotiations()` as
  recurring jobs (item 9).
- Load-test the monopoly advisory-lock path with genuinely concurrent
  requests (the local harness tested this sequentially with lock
  acquisition order forced, not with real parallel connections under load).
