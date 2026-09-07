"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Browser-side Supabase client. Uses the anon key only — every write
 * that matters (pricing, reservations, payments, approvals) goes
 * through a Postgres RPC function that enforces the real rules
 * server-side, so the anon key having RLS-limited access is safe.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
