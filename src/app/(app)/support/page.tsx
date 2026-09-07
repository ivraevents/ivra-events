import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusPill, Badge } from "@/components/ui/badge";
import { NewTicketDialog } from "@/components/support/new-ticket-dialog";
import { formatDateTime, humanize } from "@/lib/utils";
import { LifeBuoy } from "lucide-react";
import Link from "next/link";

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ allocation?: string }> }) {
  const { allocation } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, category, status, priority, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Support"
        description="Get help with bookings, payments, documents and more."
        actions={<NewTicketDialog allocationId={allocation} />}
      />
      {!tickets || tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="No tickets yet" description="Create a ticket if you need help with anything." />
      ) : (
        <Table>
          <THead>
            <TR><TH>Subject</TH><TH>Category</TH><TH>Priority</TH><TH>Created</TH><TH>Status</TH></TR>
          </THead>
          <TBody>
            {tickets.map((t) => (
              <TR key={t.id}>
                <TD>
                  <Link href={`/support/${t.id}`} className="font-medium text-navy-900 hover:text-royal-600">{t.subject}</Link>
                </TD>
                <TD>{humanize(t.category)}</TD>
                <TD><Badge tone={t.priority === "urgent" ? "error" : t.priority === "high" ? "warning" : "neutral"}>{t.priority}</Badge></TD>
                <TD>{formatDateTime(t.created_at)}</TD>
                <TD><StatusPill status={t.status} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
