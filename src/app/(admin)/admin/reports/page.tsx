import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, KpiCard } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { formatPaise, humanize } from "@/lib/utils";
import { ScrollText, IndianRupee, Store, Handshake } from "lucide-react";

export default async function AdminReportsPage() {
  const supabase = await createClient();

  const [{ data: events }, { data: allocations }, { data: payments }, { data: negotiations }] = await Promise.all([
    supabase.from("events").select("id, name, status, event_date").order("event_date", { ascending: false }),
    supabase.from("stall_allocations").select("id, event_id, status, final_price_paise, size_type, monopoly_type"),
    supabase.from("payments").select("allocation_id, amount_paise, status, purpose"),
    supabase.from("negotiation_requests").select("id, status, offer_count"),
  ]);

  const revenueByEvent = new Map<string, number>();
  const outstandingByEvent = new Map<string, number>();
  const bookingsByEvent = new Map<string, number>();

  const paidByAllocation = new Map<string, number>();
  for (const p of payments ?? []) {
    if (p.status === "verified" && p.allocation_id) {
      paidByAllocation.set(p.allocation_id, (paidByAllocation.get(p.allocation_id) ?? 0) + p.amount_paise);
    }
  }

  for (const a of allocations ?? []) {
    if (!a.event_id || a.status === "cancelled" || a.status === "draft") continue;
    bookingsByEvent.set(a.event_id, (bookingsByEvent.get(a.event_id) ?? 0) + 1);
    const paid = paidByAllocation.get(a.id) ?? 0;
    revenueByEvent.set(a.event_id, (revenueByEvent.get(a.event_id) ?? 0) + paid);
    const outstanding = Math.max((a.final_price_paise ?? 0) - paid, 0);
    outstandingByEvent.set(a.event_id, (outstandingByEvent.get(a.event_id) ?? 0) + outstanding);
  }

  const totalRevenue = [...revenueByEvent.values()].reduce((s, v) => s + v, 0);
  const totalOutstanding = [...outstandingByEvent.values()].reduce((s, v) => s + v, 0);
  const totalBookings = [...bookingsByEvent.values()].reduce((s, v) => s + v, 0);

  const negotiationCounts: Record<string, number> = {};
  for (const n of negotiations ?? []) {
    negotiationCounts[n.status] = (negotiationCounts[n.status] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports" description="Revenue, occupancy and negotiation activity across all events." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Revenue Collected" value={formatPaise(totalRevenue)} icon={IndianRupee} tone="success" />
        <KpiCard label="Outstanding Balance" value={formatPaise(totalOutstanding)} icon={IndianRupee} tone="warning" />
        <KpiCard label="Active Bookings" value={totalBookings} icon={Store} tone="navy" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by Event</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!events || events.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={ScrollText} title="No events yet" />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Event</TH>
                  <TH>Status</TH>
                  <TH>Bookings</TH>
                  <TH>Revenue Collected</TH>
                  <TH>Outstanding</TH>
                </TR>
              </THead>
              <TBody>
                {events.map((e) => (
                  <TR key={e.id}>
                    <TD>
                      <p className="font-medium text-navy-900">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.event_date}</p>
                    </TD>
                    <TD><StatusPill status={e.status} /></TD>
                    <TD>{bookingsByEvent.get(e.id) ?? 0}</TD>
                    <TD className="font-medium text-success-600">{formatPaise(revenueByEvent.get(e.id) ?? 0)}</TD>
                    <TD className="font-medium text-warning-600">{formatPaise(outstandingByEvent.get(e.id) ?? 0)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-4 w-4 text-gold-600" /> Negotiation Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(negotiationCounts).length === 0 ? (
            <p className="text-sm text-muted-foreground">No negotiations have been submitted yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {Object.entries(negotiationCounts).map(([status, count]) => (
                <div key={status} className="rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm">
                  <span className="font-semibold text-navy-900">{count}</span>{" "}
                  <span className="text-muted-foreground">{humanize(status)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
