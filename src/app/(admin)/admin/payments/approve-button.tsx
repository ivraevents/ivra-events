"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveBookingAction } from "@/lib/actions/admin-misc";
import { Stamp } from "lucide-react";

export function ApproveBookingButton({ allocationId }: { allocationId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button size="sm" variant="gold" loading={pending} onClick={() => startTransition(async () => { await approveBookingAction(allocationId); })}>
      <Stamp className="h-3.5 w-3.5" /> Approve
    </Button>
  );
}
