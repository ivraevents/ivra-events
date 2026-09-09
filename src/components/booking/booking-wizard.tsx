"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Textarea, FormField } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CountdownTimer } from "./countdown-timer";
import { KycGate } from "@/components/kyc/kyc-gate";
import { PriceBreakdownCard } from "./price-breakdown-card";
import { upsertVendorRegistration, submitRegistrationForReview, type VendorFormValues } from "@/lib/actions/registration";
import { formatPaise } from "@/lib/utils";
import type { PriceBreakdown } from "@/types/domain";
import { CheckCircle2 } from "lucide-react";

const STEPS = ["Registration", "KYC", "Review & Pay", "Confirmation"];

interface PublicSettings {
  application_fee_paise?: number;
  upi_details?: { vpa?: string; payee_name?: string };
}

export function BookingWizard({
  reservationId,
  stallId,
  stallNumber,
  eventId,
  expiresAt,
  defaultEmail,
}: {
  reservationId: string;
  stallId: string;
  stallNumber: string;
  eventId: string;
  expiresAt: string;
  defaultEmail: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [expired, setExpired] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [vendor, setVendor] = useState<VendorFormValues>({
    full_name: "", mobile: "", email: defaultEmail,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kycReady, setKycReady] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [allocationId, setAllocationId] = useState<string | null>(null);
  const [utr, setUtr] = useState("");
  const [publicSettings, setPublicSettings] = useState<PublicSettings | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletPaying, setWalletPaying] = useState(false);

  if (expired) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="font-display text-lg font-semibold text-navy-900">Your reservation has expired</p>
          <p className="text-sm text-muted-foreground">The stall hold timed out. Please pick a stall again.</p>
          <Button onClick={() => router.push("/events")}>Browse Events</Button>
        </CardContent>
      </Card>
    );
  }

  async function saveRegistration() {
    setSaving(true);
    setError(null);
    const res = await upsertVendorRegistration({ registrationId, eventId, values: vendor });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setRegistrationId(res.registrationId!);
    setStep(1);
  }

  async function fetchBreakdown() {
    setBreakdownLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("compute_price_breakdown", {
      p_stall_id: stallId,
      p_category_id: null,
      p_coupon_code: couponCode || null,
      p_negotiated_price_paise: null,
    });
    setBreakdownLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setBreakdown(data as PriceBreakdown);

    const { data: settings } = await supabase.rpc("get_public_settings");
    setPublicSettings(settings);
  }

  async function confirmBooking() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    if (registrationId) await submitRegistrationForReview(registrationId);
    const { data, error } = await supabase.rpc("convert_reservation_to_booking", {
      p_reservation_id: reservationId,
      p_registration_id: registrationId,
      p_coupon_code: couponCode || null,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setAllocationId(data.id);
    setStep(3);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: wallet } = await supabase
        .from("wallet_balance_v")
        .select("balance_paise")
        .eq("user_id", user.id)
        .maybeSingle();
      setWalletBalance(wallet?.balance_paise ?? 0);
    }
  }

  async function payFromWallet() {
    if (!breakdown || !allocationId) return;
    setWalletPaying(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("pay_from_wallet", {
      p_allocation_id: allocationId,
      p_amount_paise: breakdown.additional_advance_required_paise,
      p_purpose: "stall_advance",
    });
    setWalletPaying(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/bookings/${allocationId}`);
  }

  async function payApplicationFee() {
    const supabase = createClient();
    setSaving(true);
    await supabase.rpc("submit_payment", {
      p_purpose: "application_fee",
      p_amount_paise: publicSettings?.application_fee_paise ?? 9900,
      p_method: "upi",
      p_allocation_id: null,
      p_registration_id: registrationId,
      p_utr_reference: utr || null,
    });
    setSaving(false);
    await fetchBreakdown();
  }

  async function payAdvance() {
    if (!breakdown || !allocationId) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("submit_payment", {
      p_purpose: "stall_advance",
      p_amount_paise: breakdown.additional_advance_required_paise,
      p_method: "upi",
      p_allocation_id: allocationId,
      p_registration_id: null,
      p_utr_reference: utr,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/bookings/${allocationId}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  i < step ? "bg-success-600 text-white" : i === step ? "bg-navy-900 text-white" : "bg-cloud-200 text-charcoal-500"
                }`}
              >
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </span>
              <span className={`hidden text-xs font-medium sm:inline ${i === step ? "text-navy-900" : "text-charcoal-500"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <span className="h-px w-6 bg-border sm:w-10" />}
            </div>
          ))}
        </div>
        <CountdownTimer expiresAt={expiresAt} onExpire={() => setExpired(true)} />
      </div>

      {error && (
        <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-sm font-medium text-error-600">{error}</p>
      )}

      {step === 0 && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="font-display text-lg font-semibold text-navy-900">Vendor Details — Stall {stallNumber}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Full name" required>
                <Input required value={vendor.full_name} onChange={(e) => setVendor({ ...vendor, full_name: e.target.value })} />
              </FormField>
              <FormField label="Mobile" required>
                <Input required value={vendor.mobile} onChange={(e) => setVendor({ ...vendor, mobile: e.target.value })} />
              </FormField>
              <FormField label="Email" required>
                <Input type="email" required value={vendor.email} onChange={(e) => setVendor({ ...vendor, email: e.target.value })} />
              </FormField>
              <FormField label="PAN (optional)">
                <Input value={vendor.pan_number ?? ""} onChange={(e) => setVendor({ ...vendor, pan_number: e.target.value })} />
              </FormField>
              <FormField label="Business name">
                <Input value={vendor.business_name ?? ""} onChange={(e) => setVendor({ ...vendor, business_name: e.target.value })} />
              </FormField>
              <FormField label="GST number (optional)">
                <Input value={vendor.gst_number ?? ""} onChange={(e) => setVendor({ ...vendor, gst_number: e.target.value })} />
              </FormField>
              <FormField label="City">
                <Input value={vendor.city ?? ""} onChange={(e) => setVendor({ ...vendor, city: e.target.value })} />
              </FormField>
              <FormField label="Pincode">
                <Input value={vendor.pincode ?? ""} onChange={(e) => setVendor({ ...vendor, pincode: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Address">
              <Textarea value={vendor.address ?? ""} onChange={(e) => setVendor({ ...vendor, address: e.target.value })} />
            </FormField>
            <FormField label="Product information">
              <Textarea
                placeholder="What will you be selling at this stall?"
                value={vendor.product_info ?? ""}
                onChange={(e) => setVendor({ ...vendor, product_info: e.target.value })}
              />
            </FormField>
            <Button size="lg" loading={saving} onClick={saveRegistration} disabled={!vendor.full_name || !vendor.mobile || !vendor.email}>
              Continue to Documents
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && registrationId && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="font-display text-lg font-semibold text-navy-900">Identity Verification (KYC)</p>
            <KycGate onReadyChange={setKycReady} />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button
                className="flex-1"
                disabled={!kycReady}
                onClick={() => {
                  setStep(2);
                  fetchBreakdown();
                }}
              >
                Continue to Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <p className="font-display text-lg font-semibold text-navy-900">Coupon Code</p>
              <div className="flex gap-2">
                <Input placeholder="e.g. FLEA500" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
                <Button variant="outline" loading={breakdownLoading} onClick={fetchBreakdown}>Apply</Button>
              </div>
              {breakdown && !breakdown.coupon.valid && couponCode && (
                <p className="text-xs font-medium text-error-600">{breakdown.coupon.reason}</p>
              )}
              {breakdown && breakdown.coupon.valid && (
                <p className="text-xs font-medium text-success-600">Coupon applied: {formatPaise(breakdown.coupon_discount_paise)} off</p>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" loading={saving} onClick={confirmBooking} disabled={!breakdown}>
                  Confirm Booking &amp; Continue to Payment
                </Button>
              </div>
            </CardContent>
          </Card>
          {breakdown ? <PriceBreakdownCard breakdown={breakdown} /> : (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading price breakdown…</CardContent></Card>
          )}
        </div>
      )}

      {step === 3 && breakdown && allocationId && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <p className="font-display text-lg font-semibold text-navy-900">Pay Advance</p>

              {walletBalance !== null && (
                <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-gold-500/40 bg-gold-500/10 p-4 text-sm">
                  <span>
                    Wallet balance: <span className="font-semibold text-navy-900">{formatPaise(walletBalance)}</span>
                  </span>
                  {walletBalance >= breakdown.additional_advance_required_paise ? (
                    <Button size="sm" variant="gold" loading={walletPaying} onClick={payFromWallet}>
                      Pay from Wallet
                    </Button>
                  ) : (
                    <a href="/wallet" className="text-xs font-medium text-royal-600 underline underline-offset-2">
                      Add funds
                    </a>
                  )}
                </div>
              )}

              {publicSettings?.upi_details?.vpa && (
                <div className="rounded-[var(--radius-md)] bg-surface-muted p-4 text-sm">
                  <p>Pay to UPI ID: <span className="font-semibold">{publicSettings.upi_details.vpa}</span></p>
                  <p className="text-muted-foreground">{publicSettings.upi_details.payee_name}</p>
                </div>
              )}
              {breakdown.application_fee_credit_available_paise === 0 && (
                <Button variant="outline" onClick={payApplicationFee} loading={saving}>
                  Pay ₹99 Application Fee First (optional, credited to your advance)
                </Button>
              )}
              <FormField label="UTR / Transaction Reference" required>
                <Input required value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 123456789012" />
              </FormField>
              <Button size="lg" variant="gold" loading={saving} disabled={!utr} onClick={payAdvance}>
                Submit Payment of {formatPaise(breakdown.additional_advance_required_paise)}
              </Button>
              <p className="text-xs text-muted-foreground">
                Your payment will be verified by our team, after which your booking moves to pending approval.
              </p>
            </CardContent>
          </Card>
          <PriceBreakdownCard breakdown={breakdown} />
        </div>
      )}
    </div>
  );
}
