"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface VendorFormValues {
  full_name: string;
  mobile: string;
  email: string;
  pan_number?: string;
  business_name?: string;
  business_details?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst_number?: string;
  product_info?: string;
  category_id?: string | null;
}

/** Creates (or reuses) a draft vendor registration for the given event and upserts its details. */
export async function upsertVendorRegistration(params: {
  registrationId: string | null;
  eventId: string;
  values: VendorFormValues;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  let registrationId = params.registrationId;

  if (!registrationId) {
    const { data: reg, error: regError } = await supabase
      .from("registrations")
      .insert({ user_id: user.id, event_id: params.eventId, type: "vendor", status: "draft" })
      .select("id")
      .single();
    if (regError) return { error: regError.message };
    registrationId = reg.id;
  }

  const { error } = await supabase.from("vendor_registrations").upsert({
    registration_id: registrationId,
    ...params.values,
  });
  if (error) return { error: error.message };

  revalidatePath("/registrations");
  return { registrationId };
}

export async function submitRegistrationForReview(registrationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("registrations")
    .update({ status: "submitted" })
    .eq("id", registrationId);
  if (error) return { error: error.message };
  return { ok: true };
}
