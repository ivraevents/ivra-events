import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { StatusPill, Badge } from "@/components/ui/badge";
import { TicketThread } from "@/components/support/ticket-thread";
import { humanize } from "@/lib/utils";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ticket } = await supabase.from("support_tickets").select("*").eq("id", id).single();
  if (!ticket) notFound();

  const { data: messages } = await supabase
    .from("support_messages")
    .select("*")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={ticket.subject}
        description={`${humanize(ticket.category)} · Created ${new Date(ticket.created_at).toLocaleDateString()}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={ticket.priority === "urgent" ? "error" : "neutral"}>{ticket.priority}</Badge>
            <StatusPill status={ticket.status} />
          </div>
        }
      />
      <TicketThread ticketId={id} initialMessages={messages ?? []} currentUserId={user!.id} />
    </div>
  );
}
