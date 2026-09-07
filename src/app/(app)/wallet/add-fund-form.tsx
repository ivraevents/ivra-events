"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { IndianRupee, Hash } from "lucide-react";

export function AddFundForm({ upiDetails }: { upiDetails: { vpa?: string; payee_name?: string } | null }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function submit() {
    const rupees = Number(amount);
    if (!rupees || rupees <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!utr.trim()) {
      setError("Enter the UTR / transaction reference from your payment.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("submit_payment", {
      p_purpose: "wallet_topup",
      p_amount_paise: Math.round(rupees * 100),
      p_method: "upi",
      p_allocation_id: null,
      p_registration_id: null,
      p_utr_reference: utr,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="gold" size="lg" onClick={() => setOpen(true)}>
        <IndianRupee className="h-4 w-4" /> Add Fund
      </Button>
    );
  }

  if (done) {
    return (
      <div className="rounded-[var(--radius-md)] bg-success-100 px-4 py-3 text-sm font-medium text-success-600">
        Submitted. Your balance will update once our team verifies the payment — usually within a few hours.
      </div>
    );
  }

  return (
    <div className="flex max-w-sm flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface-muted p-4">
      {upiDetails?.vpa && (
        <p className="text-sm">
          Pay to UPI ID: <span className="font-semibold">{upiDetails.vpa}</span>
          {upiDetails.payee_name && <span className="text-muted-foreground"> ({upiDetails.payee_name})</span>}
        </p>
      )}
      {error && (
        <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-xs font-medium text-error-600">{error}</p>
      )}
      <FormField label="Amount (₹)" required>
        <Input
          icon={IndianRupee}
          inputMode="decimal"
          placeholder="1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
        />
      </FormField>
      <FormField label="UTR / Transaction Reference" required>
        <Input icon={Hash} value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 123456789012" />
      </FormField>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
          Cancel
        </Button>
        <Button className="flex-1" loading={loading} onClick={submit}>
          Submit
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        We&apos;ll add this to your wallet once our team verifies the payment against the UTR you provide.
      </p>
    </div>
  );
}
