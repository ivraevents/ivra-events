"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendUserNotification(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;
  const linkPath = String(formData.get("link_path") ?? "").trim() || null;

  if (!userId || !title) return { error: "User and title are required." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_send_notification", {
    p_user_id: userId,
    p_title: title,
    p_body: body,
    p_link_path: linkPath,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/notifications");
  return { ok: true };
}

export async function broadcastNotification(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;
  const linkPath = String(formData.get("link_path") ?? "").trim() || null;
  const roleKey = String(formData.get("role_key") ?? "").trim() || null;

  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_broadcast_notification", {
    p_title: title,
    p_body: body,
    p_link_path: linkPath,
    p_role_key: roleKey,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/notifications");
  return { ok: true, count: data as number };
}
