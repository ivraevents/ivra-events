"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function grantRole(userId: string, roleKey: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("user_roles").insert({ user_id: userId, role_key: roleKey, granted_by: user!.id });
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function revokeRole(userId: string, roleKey: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role_key", roleKey);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function toggleSuspendUser(userId: string, suspended: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_suspended: suspended }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}
