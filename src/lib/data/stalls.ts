import type { SupabaseClient } from "@supabase/supabase-js";

/** Effective negotiability = stall override, falling back to its stall_type default. */
export async function stallIsNegotiable(supabase: SupabaseClient, stallId: string): Promise<boolean> {
  const { data } = await supabase.rpc("stall_is_negotiable", { p_stall_id: stallId });
  return Boolean(data);
}
