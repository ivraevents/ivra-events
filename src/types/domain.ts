// Hand-written domain types mirroring supabase/migrations/*.sql.
// Keep in sync with the migrations when either changes.

export type StallSize = "half" | "full";
export type StallMonopoly = "monopoly" | "non_monopoly";
export type StallStatus = "available" | "reserved" | "confirmed" | "occupied" | "blocked";
export type BookingStatus =
  | "draft" | "reserved" | "payment_pending" | "pending_approval"
  | "confirmed" | "balance_pending" | "fully_paid" | "cancelled" | "completed";
export type EventStatus =
  | "draft" | "upcoming" | "registration_open" | "registration_closed"
  | "ongoing" | "completed" | "cancelled";
export type RegistrationType = "vendor" | "canopy" | "game";
export type RegistrationStatus =
  | "draft" | "submitted" | "under_review" | "approved" | "rejected" | "changes_requested";
export type DocumentKind = "aadhaar_front" | "aadhaar_back" | "pan" | "other";
export type DocumentStatus = "pending" | "approved" | "rejected" | "reupload_requested";
export type DocumentRejectionReason =
  | "aadhaar_front_unclear" | "aadhaar_back_unclear" | "wrong_document"
  | "document_mismatch" | "appears_altered" | "other";
export type PaymentPurpose =
  | "application_fee" | "stall_advance" | "stall_balance" | "stall_full"
  | "canopy_payment" | "game_payment" | "additional_advance";
export type PaymentStatus = "initiated" | "pending_verification" | "verified" | "failed" | "reversed";
export type NegotiationStatus = "pending" | "countered" | "approved" | "rejected" | "expired" | "withdrawn";
export type TicketStatus = "open" | "in_progress" | "waiting_for_user" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketCategory =
  | "booking" | "stall" | "payment" | "invoice" | "document" | "account" | "coupon" | "event" | "other";
export type RoleKey = "user" | "vendor" | "canopy_provider" | "game_provider" | "admin" | "support_manager" | "support_agent";

export interface EventListing {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  banner_url: string | null;
  venue: string | null;
  address: string | null;
  city: string | null;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: EventStatus;
  registration_start_at: string | null;
  registration_end_at: string | null;
  total_stalls: number;
  available_stalls: number;
  starting_price_paise: number | null;
}

export interface StallType {
  id: string;
  event_id: string;
  size_type: StallSize;
  monopoly_type: StallMonopoly;
  label: string | null;
  width_ft: number | null;
  length_ft: number | null;
  price_paise: number;
  advance_kind: "fixed" | "percentage" | "full";
  advance_value: number;
  is_negotiable: boolean;
  min_price_paise: number | null;
  max_discount_pct: number | null;
}

export interface Stall {
  id: string;
  event_id: string;
  stall_type_id: string;
  stall_number: string;
  preset_category_id: string | null;
  status: StallStatus;
  is_negotiable_override: boolean | null;
  price_override_paise: number | null;
  map_x: number;
  map_y: number;
  map_w: number;
  map_h: number;
  map_rotation: number;
  notes: string | null;
  stall_type?: StallType;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
}

export interface PriceBreakdown {
  original_price_paise: number;
  negotiated_price_paise: number | null;
  base_price_paise: number;
  discount_paise: number;
  coupon: { valid: boolean; reason?: string; coupon_id?: string; code?: string; discount_paise?: number };
  coupon_discount_paise: number;
  final_price_paise: number;
  required_advance_paise: number;
  application_fee_credit_available_paise: number;
  application_fee_applied_paise: number;
  additional_advance_required_paise: number;
  balance_after_advance_paise: number;
}

export interface StallAllocation {
  id: string;
  event_id: string;
  stall_id: string;
  reservation_id: string | null;
  user_id: string;
  registration_id: string | null;
  category_id: string | null;
  size_type: StallSize;
  monopoly_type: StallMonopoly;
  original_price_paise: number;
  negotiated_price_paise: number | null;
  discount_paise: number;
  coupon_discount_paise: number;
  final_price_paise: number;
  required_advance_paise: number;
  application_fee_applied_paise: number;
  status: BookingStatus;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface StallReservation {
  id: string;
  event_id: string;
  stall_id: string;
  user_id: string;
  category_id: string | null;
  status: "active" | "converted" | "expired" | "cancelled";
  expires_at: string;
  created_at: string;
}
