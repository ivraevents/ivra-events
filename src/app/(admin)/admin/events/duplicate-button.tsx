"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { duplicateEventAction } from "@/lib/actions/admin-events";

export function DuplicateEventButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      loading={pending}
      onClick={() => startTransition(async () => { await duplicateEventAction(eventId); })}
    >
      <Copy className="h-3.5 w-3.5" /> Duplicate
    </Button>
  );
}
