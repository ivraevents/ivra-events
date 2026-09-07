"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function submitCanopyRegistration(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const eventId = String(formData.get("event_id"));
  const { data: reg, error: regError } = await supabase
    .from("registrations")
    .insert({ user_id: user.id, event_id: eventId, type: "canopy", status: "submitted" })
    .select("id")
    .single();
  if (regError) return { error: regError.message };

  const { error } = await supabase.from("canopy_registrations").insert({
    registration_id: reg.id,
    name: String(formData.get("name")),
    mobile: String(formData.get("mobile")),
    email: String(formData.get("email")),
    business: String(formData.get("business") || ""),
    canopy_type: String(formData.get("canopy_type") || ""),
    width_ft: Number(formData.get("width_ft")) || null,
    length_ft: Number(formData.get("length_ft")) || null,
    capacity: Number(formData.get("capacity")) || null,
    experience_years: Number(formData.get("experience_years")) || null,
    description: String(formData.get("description") || ""),
  });
  if (error) return { error: error.message };

  redirect("/registrations");
}

export async function submitGameRegistration(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const eventId = String(formData.get("event_id"));
  const { data: reg, error: regError } = await supabase
    .from("registrations")
    .insert({ user_id: user.id, event_id: eventId, type: "game", status: "submitted" })
    .select("id")
    .single();
  if (regError) return { error: regError.message };

  const { error } = await supabase.from("game_registrations").insert({
    registration_id: reg.id,
    name: String(formData.get("name")),
    mobile: String(formData.get("mobile")),
    email: String(formData.get("email")),
    business: String(formData.get("business") || ""),
    activity_type: String(formData.get("activity_type") || ""),
    description: String(formData.get("description") || ""),
    space_required: String(formData.get("space_required") || ""),
    equipment: String(formData.get("equipment") || ""),
    safety_info: String(formData.get("safety_info") || ""),
  });
  if (error) return { error: error.message };

  redirect("/registrations");
}
