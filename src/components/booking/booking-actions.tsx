"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Textarea, FormField } from "@/components/ui/input";
import { formatPaise } from "@/lib/utils";
import { Handshake, XCircle } from "lucide-react";

export function NegotiateButton({
  allocationId, originalPricePaise, negotiable,
}: { allocationId: string; originalPricePaise: number; negotiable: boolean }) {
  const [open, setOpen] = useState(false);
  const [offer, setOffer] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!negotiable) return null;

  async function submit() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("request_negotiation", {
      p_allocation_id: allocationId,
      p_offer_price_paise: Math.round(Number(offer) * 100),
      p_message: message || null,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Handshake className="h-4 w-4" /> Request Negotiation</Button>
      </DialogTrigger>
      <DialogContent title="Request Negotiation" description={`Original price: ${formatPaise(originalPricePaise)}`}>
        <div className="flex flex-col gap-4">
          {error && <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-xs font-medium text-error-600">{error}</p>}
          <FormField label="Your offer (₹)" required>
            <Input type="number" value={offer} onChange={(e) => setOffer(e.target.value)} />
          </FormField>
          <FormField label="Message (optional)">
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
          </FormField>
          <Button loading={loading} onClick={submit} disabled={!offer}>Submit Offer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CancelBookingButton({ allocationId }: { allocationId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function cancel() {
    if (!confirm("Cancel this booking? This cannot be undone.")) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.rpc("cancel_booking", { p_allocation_id: allocationId, p_reason: "Cancelled by user" });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="destructive" loading={loading} onClick={cancel}>
      <XCircle className="h-4 w-4" /> Cancel Booking
    </Button>
  );
}

export function RespondNegotiationButtons({ negotiationId }: { negotiationId: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function respond(action: "accept" | "reject") {
    setLoading(action);
    const supabase = createClient();
    await supabase.rpc("user_negotiation_action", { p_negotiation_id: negotiationId, p_action: action });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="gold" loading={loading === "accept"} onClick={() => respond("accept")}>Accept</Button>
      <Button size="sm" variant="outline" loading={loading === "reject"} onClick={() => respond("reject")}>Reject</Button>
    </div>
  );
}
