"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { rejectPaymentAction } from "@/lib/actions/admin-misc";
import { XCircle } from "lucide-react";

export function RejectPaymentButton({ paymentId }: { paymentId: string }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <XCircle className="h-3.5 w-3.5" /> Reject
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="h-8 w-36 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-xs"
      />
      <Button
        size="sm"
        variant="destructive"
        loading={pending}
        onClick={() => startTransition(async () => { await rejectPaymentAction(paymentId, reason || undefined); })}
      >
        Confirm
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
        Cancel
      </Button>
    </div>
  );
}
