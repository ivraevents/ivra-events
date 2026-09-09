"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Number(...) || null treats a genuine 0 the same as "not entered", which
// would silently drop a deliberate "0 capacity" — this keeps 0 as 0 and
// only falls back to null for blank/invalid input.
function numOrNull(value: FormDataEntryValue | null) {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

// Unfixed ("open capacity") events don't use the Stall Types tab — their
// Half/Full price lives right on the Details tab instead. Under the hood
// it's still stored as ordinary non_monopoly stall_types rows (upserted
// here), which is what lets every existing price/booking code path treat
// an unfixed event's stalls exactly like a fixed event's — see
// 0030_open_stall_capacity.sql for the full reasoning.
async function upsertOpenStallPricing(supabase: SupabaseServer, eventId: string, formData: FormData) {
  const halfPriceRupees = formData.get("half_stall_price");
  const fullPriceRupees = formData.get("full_stall_price");
  const rows: { event_id: string; size_type: "half" | "full"; monopoly_type: "non_monopoly"; price_paise: number }[] = [];
  if (halfPriceRupees != null && String(halfPriceRupees).trim() !== "") {
    rows.push({ event_id: eventId, size_type: "half", monopoly_type: "non_monopoly", price_paise: Math.round(Number(halfPriceRupees) * 100) });
  }
  if (fullPriceRupees != null && String(fullPriceRupees).trim() !== "") {
    rows.push({ event_id: eventId, size_type: "full", monopoly_type: "non_monopoly", price_paise: Math.round(Number(fullPriceRupees) * 100) });
  }
  if (rows.length === 0) return null;
  const { error } = await supabase
    .from("stall_types")
    .upsert(rows, { onConflict: "event_id,size_type,monopoly_type" });
  return error?.message ?? null;
}

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name"));
  const stallMode = String(formData.get("stall_mode") || "fixed") === "unfixed" ? "unfixed" : "fixed";
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
      maps_url: String(formData.get("maps_url") || "") || null,
      expected_crowd: String(formData.get("expected_crowd") || "") || null,
      stall_mode: stallMode,
      total_stall_capacity: stallMode === "unfixed" ? numOrNull(formData.get("total_stall_capacity")) : null,
      status: "draft",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  if (stallMode === "unfixed") {
    const pricingError = await upsertOpenStallPricing(supabase, data.id, formData);
    if (pricingError) return { error: pricingError };
  }
  revalidatePath("/admin/events");
  redirect(`/admin/events/${data.id}`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const stallMode = String(formData.get("stall_mode") || "fixed") === "unfixed" ? "unfixed" : "fixed";
  const { error } = await supabase
    .from("events")
    .update({
      name: String(formData.get("name")),
      venue: String(formData.get("venue") || ""),
      city: String(formData.get("city") || ""),
      address: String(formData.get("address") || ""),
      maps_url: String(formData.get("maps_url") || "") || null,
      expected_crowd: String(formData.get("expected_crowd") || "") || null,
      event_date: String(formData.get("event_date")),
      description: String(formData.get("description") || ""),
      terms_and_conditions: String(formData.get("terms_and_conditions") || ""),
      status: String(formData.get("status")),
      allow_multiple_stalls: formData.get("allow_multiple_stalls") === "on",
      max_stalls_per_user: Number(formData.get("max_stalls_per_user")) || 5,
      reservation_minutes: Number(formData.get("reservation_minutes")) || 10,
      negotiation_enabled: formData.get("negotiation_enabled") === "on",
      stall_mode: stallMode,
      total_stall_capacity: stallMode === "unfixed" ? numOrNull(formData.get("total_stall_capacity")) : null,
    })
    .eq("id", eventId);
  if (error) return { error: error.message };
  if (stallMode === "unfixed") {
    const pricingError = await upsertOpenStallPricing(supabase, eventId, formData);
    if (pricingError) return { error: pricingError };
  }
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
  revalidatePath("/events");
  return { ok: true };
}

// Called after the client has already uploaded the file straight to the
// public "event-banners" storage bucket (see EventBannerUpload) — this
// just records the resulting public URL against the event. Kept separate
// from updateEvent so uploading a new photo doesn't require re-submitting
// (and re-validating) every other field on the Details tab.
export async function updateEventBanner(eventId: string, bannerUrl: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").update({ banner_url: bannerUrl }).eq("id", eventId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
  revalidatePath("/events");
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
