"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { formatPaise } from "@/lib/utils";
import { ArrowLeft, IndianRupee, UploadCloud, CheckCircle2 } from "lucide-react";

const PRESET_AMOUNTS = [1, 100, 200, 300, 400, 500, 600, 800, 900, 1000, 1500, 2000, 2500, 3000, 4000, 5000];

interface UpiDetails {
  vpa?: string;
  payee_name?: string;
}

/**
 * Add Funds — its own two-step flow, separate from the Wallet home page:
 * pick an amount, then pay via UPI QR and upload the receipt for
 * verification. Same trusted "pay, then an admin verifies" model as
 * every other payment in this app — just no UTR field, since the
 * receipt upload is the proof this time.
 */
export function AddFundsWizard({ upiDetails }: { upiDetails: UpiDetails | null }) {
  const [step, setStep] = useState<"amount" | "pay">("amount");
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const selectedAmount = amount ?? (Number(customAmount) > 0 ? Number(customAmount) : null);

  useEffect(() => {
    let active = true;

    async function generate() {
      if (step !== "pay" || !selectedAmount || !upiDetails?.vpa) {
        if (active) setQrDataUrl(null);
        return;
      }
      const upiUrl = `upi://pay?pa=${encodeURIComponent(upiDetails.vpa)}&pn=${encodeURIComponent(
        upiDetails.payee_name || "IVRA Events"
      )}&am=${selectedAmount}&cu=INR&tn=${encodeURIComponent("Wallet Top-up")}`;
      try {
        const url = await QRCode.toDataURL(upiUrl, { width: 240, margin: 1 });
        if (active) setQrDataUrl(url);
      } catch {
        if (active) setQrDataUrl(null);
      }
    }

    generate();
    return () => {
      active = false;
    };
  }, [step, selectedAmount, upiDetails]);

  async function submit() {
    if (!selectedAmount) return;
    if (!file) {
      setError("Please upload your payment screenshot.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in.");
      setLoading(false);
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/wallet-topup/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("private-documents").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      setError(uploadError.message);
      setLoading(false);
      return;
    }

    const { error: rpcError } = await supabase.rpc("submit_payment", {
      p_purpose: "wallet_topup",
      p_amount_paise: Math.round(selectedAmount * 100),
      p_method: "upi",
      p_allocation_id: null,
      p_registration_id: null,
      p_utr_reference: null,
      p_proof_storage_path: path,
    });
    setLoading(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-success-600" />
        <p className="font-display text-lg font-semibold text-navy-900">Submitted for verification</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          We&apos;ll add {formatPaise(Math.round((selectedAmount ?? 0) * 100))} to your wallet once our team verifies
          the payment — usually within a few hours.
        </p>
        <Button asChild variant="gold" className="mt-2">
          <a href="/wallet">Back to Wallet</a>
        </Button>
      </div>
    );
  }

  if (step === "amount") {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {PRESET_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setAmount(a);
                setCustomAmount("");
              }}
              className={`rounded-[var(--radius-md)] border px-3 py-3 text-sm font-semibold transition-colors ${
                amount === a
                  ? "border-gold-500 bg-gold-500/10 text-navy-900"
                  : "border-border bg-surface text-royal-600 hover:border-gold-400"
              }`}
            >
              ₹{a.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
        <FormField label="Or enter a custom amount (₹)">
          <Input
            icon={IndianRupee}
            inputMode="decimal"
            placeholder="e.g. 750"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value.replace(/[^0-9.]/g, ""));
              setAmount(null);
            }}
          />
        </FormField>
        <Button size="lg" variant="gold" disabled={!selectedAmount} onClick={() => setStep("pay")}>
          Continue{selectedAmount ? ` · ${formatPaise(Math.round(selectedAmount * 100))}` : ""}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => setStep("amount")}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-royal-600"
      >
        <ArrowLeft className="h-4 w-4" /> Change amount
      </button>

      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-6 text-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount to Pay</p>
          <p className="mt-1 font-display text-3xl font-semibold text-navy-900">
            {formatPaise(Math.round((selectedAmount ?? 0) * 100))}
          </p>
        </div>
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a locally generated data: URL, not a remote image
          <img
            src={qrDataUrl}
            alt="UPI payment QR code"
            className="h-56 w-56 rounded-[var(--radius-md)] border border-border bg-white p-2"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {upiDetails?.vpa ? "Generating QR code…" : "UPI payment details aren't set up yet — contact support to add funds."}
          </p>
        )}
        {upiDetails?.vpa && (
          <p className="text-xs text-muted-foreground">
            Scan the QR code and pay the exact amount shown, then upload your payment screenshot below.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-xs font-medium text-error-600">{error}</p>
      )}

      <FormField label="Upload Payment Receipt" required>
        <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5 text-sm hover:bg-surface-muted">
          <UploadCloud className="h-4 w-4 shrink-0 text-charcoal-500" />
          <span className="truncate">{file ? file.name : "Choose File — no file selected"}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </FormField>

      <Button size="lg" variant="gold" loading={loading} disabled={!upiDetails?.vpa} onClick={submit}>
        <UploadCloud className="h-4 w-4" /> Submit
      </Button>
    </div>
  );
}
