"use server";

import { createClient } from "@/lib/supabase/server";

export async function completeProfile({ fullName, mobile }: { fullName: string; mobile: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, mobile, profile_complete: true })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "This mobile number is already registered to another account." };
    }
    return { error: error.message };
  }
  return { ok: true };
}
