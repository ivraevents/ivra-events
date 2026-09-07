import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. SERVER-ONLY (the `server-only` import
 * above makes any accidental client-bundle import a build error).
 *
 * Use this ONLY for the few operations that genuinely cannot go through
 * RLS + a SECURITY DEFINER RPC — e.g. generating a signed URL for a
 * document after independently re-checking authorization in the calling
 * route handler. Prefer lib/supabase/server.ts (the user-scoped client +
 * RPC functions) for everything else; that is what keeps "the database
 * is the source of truth" true in practice.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
