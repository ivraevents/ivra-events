import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusPill, Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import Link from "next/link";

// Cross-event view of every monopoly stall that has been booked, so
// admins can see category exclusivity at a glance without opening each
// event individually. Per-event monopoly SCOPE is configured on the
// event's "Categories & Monopoly" tab.
export default async function MonopolyPage() {
  const supabase = await createClient();
  const { data: allocations } = await supabase
    .from("stall_allocations")
    .select("id, status, category_id, categories(name), stalls(stall_number, events(name)), monopoly_type")
    .eq("monopoly_type", "monopoly")
    .not("status", "in", "(cancelled,completed)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Monopoly Management" description="Every category currently locked as a monopoly booking, across all events." />
      {!allocations || allocations.length === 0 ? (
        <EmptyState icon={Crown} title="No monopoly bookings yet" />
      ) : (
        <Table>
          <THead><TR><TH>Event</TH><TH>Stall</TH><TH>Category</TH><TH>Status</TH></TR></THead>
          <TBody>
            {allocations.map((a: any) => (
              <TR key={a.id}>
                <TD>{a.stalls?.events?.name}</TD>
                <TD>{a.stalls?.stall_number}</TD>
                <TD><Badge tone="gold">{a.categories?.name ?? "—"}</Badge></TD>
                <TD><StatusPill status={a.status} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <p className="text-xs text-muted-foreground">
        To change whether a category is event-wide exclusive, per-category exclusive, or open, go to{" "}
        <Link href="/admin/events" className="text-royal-600 font-medium">Events → Categories &amp; Monopoly</Link>.
      </p>
    </div>
  );
}
