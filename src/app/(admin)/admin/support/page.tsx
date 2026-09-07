import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusPill, Badge } from "@/components/ui/badge";
import { formatDateTime, humanize } from "@/lib/utils";
import { Headphones } from "lucide-react";
import Link from "next/link";

export default async function AdminSupportPage() {
  const supabase = await createClient();
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, category, status, priority, created_at, profiles(full_name, email)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Support" description="All tickets raised by vendors and providers." />
      {!tickets || tickets.length === 0 ? (
        <EmptyState icon={Headphones} title="No tickets" />
      ) : (
        <Table>
          <THead><TR><TH>Subject</TH><TH>User</TH><TH>Category</TH><TH>Priority</TH><TH>Created</TH><TH>Status</TH></TR></THead>
          <TBody>
            {tickets.map((t: any) => (
              <TR key={t.id}>
                <TD><Link href={`/admin/support/${t.id}`} className="font-medium text-navy-900 hover:text-royal-600">{t.subject}</Link></TD>
                <TD>{t.profiles?.full_name}</TD>
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
