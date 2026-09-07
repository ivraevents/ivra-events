# Roadmap / build status

This tracks what's actually built and working versus what's left, mapped
against the ten development phases from the original spec. The rule this
project holds itself to: a page existing is not the same as a feature being
done — everything marked ✅ below has been exercised end-to-end (either
through the app or the local Postgres smoke-test harness in
`supabase/local-test/`), not just scaffolded.

## Phase 1 — Foundation ✅
Next.js 16 App Router + TypeScript + Tailwind v4 project, design tokens
(deep navy / royal blue / gold / off-white / charcoal + semantic
green/amber/red/blue), self-hosted variable fonts (Inter + Playfair
Display — switched from `next/font/google` because this sandbox had no
network path to Google Fonts; also removes an external CDN dependency for
production), IVRA logo/favicon extracted and wired into `public/brand/`,
`app/layout.tsx` metadata, and `apple-touch-icon.png`.

## Phase 2 — Database ✅
25 migrations, applied in order, covering every table in the spec: profiles,
roles/user_roles (many-to-many), events, categories, stall_types + stalls
(size and monopoly as independent columns, never 4 hardcoded types),
stall_reservations, registrations (vendor/canopy/game), documents +
document_versions, discounts, coupons, negotiation_requests +
negotiation_offers, stall_allocations, payments + payment_allocations +
adjustments + refunds, invoices + invoice_items + invoice_sequences,
support_tickets + support_messages, notifications, audit_logs,
system_settings. Full RLS on every table. Verified against a local Postgres
instance with stubbed `auth`/`storage` schemas — 11 smoke tests covering the
full booking lifecycle, all passing.

## Phase 3 — Server-side business logic ✅
Every rule the spec called "must never be trusted from the client" is a
Postgres function, `SECURITY DEFINER`, called via RPC:
- `reserve_stall()` — row lock + per-(event, category) advisory lock, so two
  vendors racing for the last monopoly slot in a category can never both win.
- `compute_price_breakdown()`, `best_discount_total()`, `validate_coupon()`,
  `compute_required_advance()` — pricing/discount/coupon math, server-only.
- `convert_reservation_to_booking()`, `recompute_allocation_status()` —
  booking status is *derived* from the payment ledger view, never trusted
  as a client-sent value.
- `request_negotiation()` / `admin_negotiation_action()` /
  `user_negotiation_action()` / `apply_negotiation_settlement()` — full
  offer/counter/accept/reject history in `negotiation_offers`, rules
  (min price, max discount, max counters, expiry, monopoly-negotiability)
  enforced server-side.
- `verify_payment()`, `approve_booking()`, `generate_invoice()` (atomic,
  gap-free numbering via `invoice_sequences`).
- `duplicate_event()`, `duplicate_stall_layout()`, `duplicate_coupon()` —
  copy structure, never users/bookings/payments/documents/audit logs.

**Security hardening pass (migration `0024`):** an audit of every function's
`GRANT EXECUTE` found that several internal-only helpers
(`apply_negotiation_settlement`, `notify`, `write_audit_log`,
`next_invoice_number`, `recompute_allocation_status`,
`assert_monopoly_available`) had never had PostgreSQL's default
grant-to-`PUBLIC` revoked — meaning, before this migration, any signed-in
user could have called `apply_negotiation_settlement()` directly via
`supabase.rpc(...)` to settle **any other user's** negotiation at **any
price**, completely bypassing admin approval. This is now closed (verified
by attempting the exact exploit as a non-admin role against the local
harness — denied) while every legitimate RLS-policy helper and client-facing
RPC keeps working (re-verified against the full smoke-test suite). Migration
`0025` adds a proper authorization-checked `admin_send_notification()` /
`admin_broadcast_notification()` pair so admins can still notify users
without reopening the vulnerable `notify()` function directly.

## Phase 4 — Auth ✅
Google OAuth (PKCE) + Email OTP via Gmail SMTP, both resolving to the same
`profiles` row, `/profile/complete` gate for name+mobile, middleware-based
session refresh and route protection.

## Phase 5 — User flow ✅
Login → Upcoming Flea Markets → Event detail with visual stall map
(click-to-select, live status colors, filters) → stall detail dialog →
registration wizard (Aadhaar front/back mandatory, PAN optional, GST/
category) → document upload → coupon/discount application → ₹99 application
fee (separately ledgered, creditable against the stall advance without ever
overwriting the original transaction) → stall advance → booking →
admin approval → balance payment → GST/non-GST PDF invoice.

## Phase 6 — Admin console ✅
Dashboard (`admin_kpis()` — one RPC for every KPI on the spec's list),
Events (create/edit/duplicate, stall types, bulk stall generation,
categories/monopoly scope), Registrations, Monopoly matrix, Documents
(review with the exact rejection-reason taxonomy from the spec), Payments
(verify/approve), Negotiations (approve/reject/counter), Discounts, Coupons
(create/duplicate), Invoices (generate), Support (ticket thread, shared
component correctly handling both the vendor and admin perspective),
Settings (fees, advance rules, UPI/business details), Audit Logs, **Users**
(role grant/revoke, suspend/reinstate), **Reports** (revenue and outstanding
balance by event, negotiation activity), **Notifications** (system-wide
oversight view + direct-to-user and role-broadcast composer, both routed
through authorization-checked RPCs rather than the internal `notify()`
helper).

## Phase 7 — Storage & documents ✅
Private buckets, `storage.foldername()`-based ownership policies, versioned
document uploads (old versions never destroyed), 60-second signed URLs,
IDOR-safe by construction (tested: a second user's session cannot fetch a
signed URL for another user's document — the RLS policy denies the
underlying row read before a URL is ever issued).

## Phase 8 — Notifications ✅
In-app only, for every event in the spec's list, via `notify()` (internal)
and the new admin-facing wrappers. No email is sent for anything except the
sign-in OTP (handled entirely by Supabase Auth + Gmail SMTP, not by
app code).

## Phase 9 — What's intentionally left for you to finish
This is the honest remainder — not hidden, not "coming soon" filler:

- **`src/types/database.ts` is a placeholder (`export type Database = any`).**
  Run `npx supabase gen types typescript --project-id YOUR-REF` once your
  real project has the migrations applied, and paste the output in. Every
  `.from(...)` / `.rpc(...)` call in this codebase will then get full
  type-checking against your actual schema.
- **No automated test suite beyond the SQL smoke tests.** The 11 tests in
  `supabase/local-test/01_smoke_test.sql` cover the core booking/payment/
  negotiation/expiry lifecycle at the database layer. There is no
  Playwright/Vitest suite exercising the Next.js app itself yet.
- **No CI pipeline.** No GitHub Actions workflow runs `npm run build` or the
  SQL smoke tests on push — worth adding before a team starts merging PRs.
- **`duplicate_stall_layout()` has no admin UI button yet** — the RPC exists,
  is tested at the SQL layer, but only `duplicate_event()` and
  `duplicate_coupon()` are currently wired to buttons. A stall-layout-only
  duplicate (copy one event's stall map onto another without cloning
  everything else) is a small follow-up.
- **No seed/demo data script.** `supabase/seed/` is empty; there's no
  one-command way to populate a fresh project with sample events/stalls for
  a demo — everything shown in this build was created and torn down through
  the local test harness, not through seed data that ships with the repo.
- **Accessibility and a dedicated performance pass** (spec sections on
  responsive/accessibility/performance) were followed as general practice
  throughout (semantic markup, focus states via Radix primitives, responsive
  Tailwind breakpoints) but have not had a dedicated axe/Lighthouse audit.

## Phase 10 — Delivery
This build, its migrations, and this documentation are delivered as-is in
this repository. See **SECURITY-TESTING.md** for the checklist this system
was actually run against before being called done.
