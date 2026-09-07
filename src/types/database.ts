/**
 * Placeholder Supabase database types.
 *
 * Once this app is connected to a real Supabase project, replace this
 * file by running:
 *
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
 *
 * Until then, typing every table/view/RPC function by hand here would
 * drift from supabase/migrations/*.sql the moment either changes — so we
 * keep the Supabase client permissive (safe: RLS is still fully
 * enforced server-side, this only affects compile-time autocomplete)
 * and rely on the domain types in src/types/domain.ts, which mirror the
 * migrations directly, for everything the UI actually reads and writes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
