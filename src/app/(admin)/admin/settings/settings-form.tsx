"use client";

import { useState, useTransition } from "react";
import { Input, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateSystemSetting } from "@/lib/actions/admin-misc";

export function SettingsForm({ settings }: { settings: Record<string, any> }) {
  const [applicationFee, setApplicationFee] = useState(String((settings.application_fee_paise ?? 9900) / 100));
  const [maxStalls, setMaxStalls] = useState(String(settings.default_max_stalls_per_user ?? 5));
  const [reservationMinutes, setReservationMinutes] = useState(String(settings.default_reservation_minutes ?? 10));
  const [upiVpa, setUpiVpa] = useState(settings.upi_details?.vpa ?? "");
  const [upiName, setUpiName] = useState(settings.upi_details?.payee_name ?? "");
  const [businessName, setBusinessName] = useState(settings.business_details?.legal_name ?? "");
  const [gstin, setGstin] = useState(settings.business_details?.gstin ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setSaved(false);
    startTransition(async () => {
      await Promise.all([
        updateSystemSetting("application_fee_paise", Math.round(Number(applicationFee) * 100)),
        updateSystemSetting("default_max_stalls_per_user", Number(maxStalls)),
        updateSystemSetting("default_reservation_minutes", Number(reservationMinutes)),
        updateSystemSetting("upi_details", { vpa: upiVpa, payee_name: upiName }),
        updateSystemSetting("business_details", { ...settings.business_details, legal_name: businessName, gstin }),
      ]);
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {saved && <p className="rounded-[var(--radius-md)] bg-success-100 px-3 py-2 text-xs font-medium text-success-600">Settings saved.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Application Fee (₹)"><Input type="number" value={applicationFee} onChange={(e) => setApplicationFee(e.target.value)} /></FormField>
        <FormField label="Default Max Stalls Per User"><Input type="number" value={maxStalls} onChange={(e) => setMaxStalls(e.target.value)} /></FormField>
        <FormField label="Default Reservation Hold (minutes)"><Input type="number" value={reservationMinutes} onChange={(e) => setReservationMinutes(e.target.value)} /></FormField>
        <FormField label="Business Name"><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></FormField>
        <FormField label="GSTIN"><Input value={gstin} onChange={(e) => setGstin(e.target.value)} /></FormField>
        <FormField label="UPI VPA"><Input value={upiVpa} onChange={(e) => setUpiVpa(e.target.value)} placeholder="business@upi" /></FormField>
        <FormField label="UPI Payee Name"><Input value={upiName} onChange={(e) => setUpiName(e.target.value)} /></FormField>
      </div>
      <Button onClick={save} loading={pending} className="self-start">Save Settings</Button>
    </div>
  );
}
