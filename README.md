# IVRA Events

A production-ready flea market / event management platform: vendors, canopy
and game/entertainment providers register for events, pick stalls off a
visual map, negotiate pricing, pay advances and balances, and get GST/non-GST
invoices — all backed by Postgres RLS and server-side business logic so the
frontend is never trusted for pricing, availability, or monopoly rules.

Stack: **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**, **Supabase**
(Postgres, Auth, Storage), deployed on **Vercel**.

---

## 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine to start)
- A Gmail account for sending the 6-digit OTP emails (can be a different
  Google account than the one you use for Supabase/Vercel)
- A Google Cloud project for "Sign in with Google" OAuth credentials

## 2. Clone & install

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page, "anon public" key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page, "service_role" key — **server-only, never expose to the client** |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally, your Vercel URL in production |

## 3. Database setup

The entire schema — tables, enums, triggers, RLS policies, and every piece of
business logic (pricing, monopoly locking, negotiation, payments, invoicing)
— lives in `supabase/migrations/0001` through `0025`, in order. Nothing here
is optional scaffolding; this is the real schema.

**Option A — Supabase CLI (recommended):**

```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase db push
```

**Option B — SQL Editor:** open each file in
`supabase/migrations/` in numeric order and run it in the Supabase Dashboard's
SQL Editor. Order matters — later migrations depend on earlier ones.

> `supabase/local-test/` is **not** part of the real schema. It's a
> throwaway harness (stubbed `auth`/`storage` schemas) used during
> development to test the migrations and business logic against a plain
> local Postgres before a real Supabase project existed. Never run it
> against your real project.

## 4. Auth setup (Supabase Dashboard → Authentication)

**Email OTP via Gmail SMTP:**
1. Go to **Authentication → Providers → Email** and make sure "Email OTP" /
   magic-link style one-time codes are enabled (this app calls
   `signInWithOtp` and `verifyOtp`, never a password).
2. Go to **Project Settings → Auth → SMTP Settings**, enable custom SMTP,
   and enter:
   - Host: `smtp.gmail.com`, Port: `587`
   - Username: your sending Gmail address
   - Password: a **Google App Password** (Google Account → Security → App
     Passwords — you need 2FA on for this to appear), never your normal
     Gmail password
   - Sender name: `IVRA Events`

   This Gmail account can be completely separate from whatever account owns
   your Supabase project or Vercel deployment.

**Google OAuth:**
1. In [Google Cloud Console](https://console.cloud.google.com), create an
   OAuth 2.0 Client ID (Web application). Add
   `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` as an authorized
   redirect URI.
2. In Supabase Dashboard → **Authentication → Providers → Google**, paste the
   Client ID and Client Secret, and enable the provider.
3. Add your app's own redirect URL (`{NEXT_PUBLIC_SITE_URL}/auth/callback`)
   to the Google OAuth client's authorized redirect URIs as well, and to
   Supabase's "Redirect URLs" allow-list under **Authentication → URL
   Configuration**.

Both sign-in methods land on the same `profiles` row per email (see
migration `0002`), and a new user is routed to `/profile/complete` until
they've supplied their name and mobile number.

## 5. Storage

Migration `0020_storage.sql` creates the private Supabase Storage buckets
(vendor documents, event banners, etc.) and their `storage.objects` RLS
policies as part of `db push` — there's no separate manual bucket-creation
step. Every document bucket is **private**; the app only ever hands out
short-lived signed URLs (see `src/app/api/documents/[versionId]/signed-url/route.ts`,
60-second expiry) and RLS guarantees one user can never fetch another user's
document, even if they guess the storage path.

## 6. Bootstrap the first admin

There is deliberately no way to create an admin account through the UI —
`bootstrap_first_admin()` is the **only** path, and it permanently refuses to
run a second time once any admin exists (see migration `0021`):

1. Sign in once through the normal `/login` flow with the account that
   should become the founding admin, and complete the profile form.
2. In the Supabase SQL Editor, run:
   ```sql
   select public.bootstrap_first_admin('online@navrathan.com');
   ```
3. Sign out and back in (or just refresh) — the account now has the `admin`
   role and the `/admin` section unlocks. From here, grant further admins
   from **Admin → Users** in the app itself.

## 7. Run locally

```bash
npm run dev
```

## 8. Deploy

Push to GitHub, import the repo into Vercel, add the same environment
variables from `.env.local` in the Vercel project settings, and deploy.
Update `NEXT_PUBLIC_SITE_URL` to the production URL and add it to Supabase's
Auth redirect allow-list.

## Notifications

Every event in the system — registration approvals/rejections, document
review outcomes, payment verification, booking confirmation, negotiation
updates, invoice generation, support replies — is delivered as an **in-app
notification** (`notifications` table + the bell icon in the app shell).
The only email the system ever sends is the sign-in OTP, via Gmail SMTP
configured above. There is no Resend/SendGrid/Mailgun/Apps Script anywhere
in this codebase.

## Project structure

```
src/
  app/
    (app)/            user-facing pages (dashboard, events, bookings, ...)
    (admin)/admin/     full admin console
    api/               PDF invoices, signed document URLs
    auth/, login/      Google OAuth callback, email OTP screens
  components/          UI primitives (design system) + feature components
  lib/
    supabase/          browser/server/admin/middleware Supabase clients
    actions/           server actions — thin wrappers around SQL RPCs
  types/               hand-written domain types mirroring the SQL schema
supabase/
  migrations/          0001-0025, the entire real schema, in order
  local-test/          dev-only harness, NOT part of the real schema
```

See also: **ROADMAP.md** (what's built vs. what's left to polish) and
**SECURITY-TESTING.md** (the manual verification checklist — IDOR,
double-booking, monopoly races, authorization bypass — that this build was
validated against before delivery).
