"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminNegotiationActionFn } from "@/lib/actions/admin-misc";
import { Check, X, ArrowLeftRight } from "lucide-react";

export function NegotiationRespondActions({ negotiationId, suggestedPrice }: { negotiationId: string; suggestedPrice: number }) {
  const [pending, startTransition] = useTransition();
  const [counter, setCounter] = useState(String(suggestedPrice));
  const [showCounter, setShowCounter] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="gold" loading={pending} onClick={() => startTransition(async () => { await adminNegotiationActionFn(negotiationId, "approve"); })}>
        <Check className="h-3.5 w-3.5" /> Approve
      </Button>
      <Button size="sm" variant="destructive" loading={pending} onClick={() => startTransition(async () => { await adminNegotiationActionFn(negotiationId, "reject"); })}>
        <X className="h-3.5 w-3.5" /> Reject
      </Button>
      {showCounter ? (
        <div className="flex items-center gap-2">
          <Input type="number" value={counter} onChange={(e) => setCounter(e.target.value)} className="w-28" />
          <Button size="sm" variant="outline" loading={pending} onClick={() => startTransition(async () => { await adminNegotiationActionFn(negotiationId, "counter", Number(counter)); })}>
            Send Counter
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowCounter(true)}>
          <ArrowLeftRight className="h-3.5 w-3.5" /> Counter Offer
        </Button>
      )}
    </div>
  );
}
