import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";

export default async function AdminAuditLogsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const pageNum = Number(page) || 1;
  const pageSize = 50;
  const supabase = await createClient();

  const { data: logs, count } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, created_at, profiles(full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((pageNum - 1) * pageSize, pageNum * pageSize - 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Audit Logs" description="Immutable record of every sensitive action taken in the system." />
      {!logs || logs.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No audit events yet" />
      ) : (
        <Table>
          <THead><TR><TH>Time</TH><TH>Actor</TH><TH>Action</TH><TH>Entity</TH></TR></THead>
          <TBody>
            {logs.map((l: any) => (
              <TR key={l.id}>
                <TD>{formatDateTime(l.created_at)}</TD>
                <TD>{l.profiles?.full_name ?? "System"}</TD>
                <TD className="font-mono text-xs">{l.action}</TD>
                <TD className="font-mono text-xs text-muted-foreground">{l.entity_type} · {l.entity_id?.slice(0, 8)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <p className="text-xs text-muted-foreground">Showing page {pageNum} of {Math.max(1, Math.ceil((count ?? 0) / pageSize))} · {count ?? 0} total events</p>
    </div>
  );
}
