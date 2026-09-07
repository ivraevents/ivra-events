"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function reviewRegistration(registrationId: string, status: "approved" | "rejected" | "changes_requested", reason?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("registrations")
    .update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString(), rejection_reason: reason ?? null })
    .eq("id", registrationId);
  if (error) return { error: error.message };

  const { data: reg } = await supabase.from("registrations").select("user_id").eq("id", registrationId).single();
  if (reg) {
    await supabase.rpc("notify", {
      p_user_id: reg.user_id,
      p_type: status === "approved" ? "registration_approved" : "registration_rejected",
      p_title: status === "approved" ? "Registration approved" : "Registration needs attention",
      p_body: reason ?? null,
      p_link_path: "/registrations",
    });
  }

  revalidatePath("/admin/registrations");
  return { ok: true };
}

export async function reviewDocumentAction(versionId: string, action: "approve" | "reject" | "reupload", reason?: string, note?: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_document", {
    p_document_version_id: versionId,
    p_action: action,
    p_reason: reason ?? null,
    p_note: note ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/documents");
  return { ok: true };
}

export async function verifyPaymentAction(paymentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_payment", { p_payment_id: paymentId });
  if (error) return { error: error.message };
  revalidatePath("/admin/payments");
  return { ok: true };
}

export async function adminNegotiationActionFn(negotiationId: string, action: "approve" | "reject" | "counter", price?: number, message?: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_negotiation_action", {
    p_negotiation_id: negotiationId,
    p_action: action,
    p_price_paise: price ? Math.round(price * 100) : null,
    p_message: message ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/negotiations");
  return { ok: true };
}

export async function approveBookingAction(allocationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_booking", { p_allocation_id: allocationId });
  if (error) return { error: error.message };
  revalidatePath("/admin/payments");
  return { ok: true };
}

export async function generateInvoiceAction(params: {
  userId: string; allocationId?: string; paymentId?: string; amount: number; description: string; invoiceType: "gst" | "non_gst"; taxRate?: number;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_invoice", {
    p_user_id: params.userId,
    p_payment_id: params.paymentId ?? null,
    p_allocation_id: params.allocationId ?? null,
    p_registration_id: null,
    p_invoice_type: params.invoiceType,
    p_description: params.description,
    p_amount_paise: Math.round(params.amount * 100),
    p_tax_rate_pct: params.taxRate ?? 0,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/invoices");
  return { ok: true, invoiceId: data.id };
}

export async function updateSystemSetting(key: string, value: unknown) {
  const supabase = await createClient();
  const { error } = await supabase.from("system_settings").update({ value }).eq("key", key);
  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function createDiscount(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("discounts").insert({
    name: String(formData.get("name")),
    kind: String(formData.get("kind")),
    value: Number(formData.get("value")),
    event_id: formData.get("event_id") || null,
    category_id: formData.get("category_id") || null,
    is_stackable: formData.get("is_stackable") === "on",
    per_user_limit: Number(formData.get("per_user_limit")) || 1,
    usage_limit: formData.get("usage_limit") ? Number(formData.get("usage_limit")) : null,
    max_discount_paise: formData.get("max_discount") ? Math.round(Number(formData.get("max_discount")) * 100) : null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/discounts");
  return { ok: true };
}

export async function toggleDiscountActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  await supabase.from("discounts").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/admin/discounts");
}

export async function createCoupon(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("coupons").insert({
    code: String(formData.get("code")).toUpperCase(),
    description: String(formData.get("description") || ""),
    kind: String(formData.get("kind")),
    value: Number(formData.get("value")),
    event_id: formData.get("event_id") || null,
    per_user_limit: Number(formData.get("per_user_limit")) || 1,
    usage_limit: formData.get("usage_limit") ? Number(formData.get("usage_limit")) : null,
    max_discount_paise: formData.get("max_discount") ? Math.round(Number(formData.get("max_discount")) * 100) : null,
    is_active: true,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function toggleCouponActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  await supabase.from("coupons").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/admin/coupons");
}

export async function duplicateCouponAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("duplicate_coupon", { p_coupon_id: id, p_new_code: null });
  if (error) return { error: error.message };
  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function assignTicket(ticketId: string, status?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const updates: Record<string, unknown> = { assigned_to: user!.id };
  if (status) updates.status = status;
  await supabase.from("support_tickets").update(updates).eq("id", ticketId);
  revalidatePath("/admin/support");
}

export async function sendStaffReply(ticketId: string, message: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("support_messages").insert({
    ticket_id: ticketId, sender_id: user!.id, is_staff: true, message,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
