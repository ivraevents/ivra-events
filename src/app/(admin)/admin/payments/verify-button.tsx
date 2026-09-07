"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { verifyPaymentAction } from "@/lib/actions/admin-misc";
import { CheckCircle2 } from "lucide-react";

export function VerifyPaymentButton({ paymentId }: { paymentId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button size="sm" variant="gold" loading={pending} onClick={() => startTransition(async () => { await verifyPaymentAction(paymentId); })}>
      <CheckCircle2 className="h-3.5 w-3.5" /> Verify
    </Button>
  );
}
