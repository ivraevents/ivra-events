"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name"));
  const { data, error } = await supabase
    .from("events")
    .insert({
      name,
      slug: slugify(name) + "-" + Date.now().toString(36),
      venue: String(formData.get("venue") || ""),
      city: String(formData.get("city") || ""),
      address: String(formData.get("address") || ""),
      event_date: String(formData.get("event_date")),
      description: String(formData.get("description") || ""),
      status: "draft",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/admin/events");
  redirect(`/admin/events/${data.id}`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({
      name: String(formData.get("name")),
      venue: String(formData.get("venue") || ""),
      city: String(formData.get("city") || ""),
      address: String(formData.get("address") || ""),
      event_date: String(formData.get("event_date")),
      description: String(formData.get("description") || ""),
      terms_and_conditions: String(formData.get("terms_and_conditions") || ""),
      status: String(formData.get("status")),
      allow_multiple_stalls: formData.get("allow_multiple_stalls") === "on",
      max_stalls_per_user: Number(formData.get("max_stalls_per_user")) || 5,
      reservation_minutes: Number(formData.get("reservation_minutes")) || 10,
      negotiation_enabled: formData.get("negotiation_enabled") === "on",
    })
    .eq("id", eventId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: true };
}

export async function duplicateEventAction(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("duplicate_event", { p_event_id: eventId });
  if (error) return { error: error.message };
  revalidatePath("/admin/events");
  redirect(`/admin/events/${data}`);
}

export async function createStallType(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("stall_types").insert({
    event_id: eventId,
    size_type: String(formData.get("size_type")),
    monopoly_type: String(formData.get("monopoly_type")),
    width_ft: Number(formData.get("width_ft")) || null,
    length_ft: Number(formData.get("length_ft")) || null,
    price_paise: Math.round(Number(formData.get("price")) * 100),
    advance_kind: String(formData.get("advance_kind")),
    advance_value: Number(formData.get("advance_value")),
    is_negotiable: formData.get("is_negotiable") === "on",
    min_price_paise: formData.get("min_price") ? Math.round(Number(formData.get("min_price")) * 100) : null,
    max_discount_pct: formData.get("max_discount_pct") ? Number(formData.get("max_discount_pct")) : null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: true };
}

export async function bulkGenerateStallsAction(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("bulk_generate_stalls", {
    p_event_id: eventId,
    p_stall_type_id: String(formData.get("stall_type_id")),
    p_prefix: String(formData.get("prefix") || "A"),
    p_start: Number(formData.get("start")) || 1,
    p_count: Number(formData.get("count")) || 1,
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: true };
}

export async function updateStallAction(stallId: string, eventId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("stalls")
    .update({
      status: String(formData.get("status")),
      map_x: Number(formData.get("map_x")) || 0,
      map_y: Number(formData.get("map_y")) || 0,
      map_w: Number(formData.get("map_w")) || 1,
      map_h: Number(formData.get("map_h")) || 1,
      preset_category_id: formData.get("preset_category_id") || null,
    })
    .eq("id", stallId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: true };
}

export async function setEventCategoryMonopoly(eventId: string, categoryId: string, scope: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_categories")
    .upsert({ event_id: eventId, category_id: categoryId, monopoly_scope: scope });
  if (error) return { error: error.message };
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: true };
}
