"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { assignTicket } from "@/lib/actions/admin-misc";
import type { TicketStatus } from "@/types/domain";

const STATUSES: TicketStatus[] = ["open", "in_progress", "waiting_for_user", "resolved", "closed"];

export function TicketStatusControls({ ticketId, status }: { ticketId: string; status: TicketStatus }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function setStatus(s: string) {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("support_tickets").update({ status: s }).eq("id", ticketId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={status}
        disabled={pending}
        onChange={(e) => setStatus(e.target.value)}
        className="h-9 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm"
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
      </select>
      <Button size="sm" variant="outline" loading={pending} onClick={() => startTransition(() => assignTicket(ticketId))}>
        Assign to me
      </Button>
    </div>
  );
}
