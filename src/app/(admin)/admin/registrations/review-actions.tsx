"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { reviewRegistration } from "@/lib/actions/admin-misc";
import { Check, X, RotateCcw } from "lucide-react";

export function RegistrationReviewActions({ registrationId, status }: { registrationId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  if (!["submitted", "under_review"].includes(status)) return null;

  return (
    <div className="flex gap-1.5">
      <Button size="sm" variant="gold" loading={pending} onClick={() => startTransition(async () => { await reviewRegistration(registrationId, "approved"); })}>
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="outline" loading={pending} onClick={() => startTransition(async () => { await reviewRegistration(registrationId, "changes_requested", "Please review and resubmit"); })}>
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="destructive" loading={pending} onClick={() => startTransition(async () => { await reviewRegistration(registrationId, "rejected", "Does not meet requirements"); })}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
