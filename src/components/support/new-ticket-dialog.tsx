"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, FormField } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";
import type { TicketCategory } from "@/types/domain";

const CATEGORIES: TicketCategory[] = ["booking", "stall", "payment", "invoice", "document", "account", "coupon", "event", "other"];

export function NewTicketDialog({ allocationId }: { allocationId?: string }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("other");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({ user_id: user!.id, subject, category, allocation_id: allocationId ?? null })
      .select("id")
      .single();

    if (ticketError) {
      setError(ticketError.message);
      setLoading(false);
      return;
    }

    const { error: msgError } = await supabase
      .from("support_messages")
      .insert({ ticket_id: ticket.id, sender_id: user!.id, is_staff: false, message });

    setLoading(false);
    if (msgError) {
      setError(msgError.message);
      return;
    }
    setOpen(false);
    router.push(`/support/${ticket.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> New Ticket</Button>
      </DialogTrigger>
      <DialogContent title="New Support Ticket">
        <div className="flex flex-col gap-4">
          {error && <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-xs font-medium text-error-600">{error}</p>}
          <FormField label="Subject" required>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </FormField>
          <FormField label="Category" required>
            <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Message" required>
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </FormField>
          <Button onClick={submit} loading={loading} disabled={!subject || !message}>Create Ticket</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
