import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusPill } from "@/components/ui/badge";
import { formatDate, formatPaise } from "@/lib/utils";
import { Store } from "lucide-react";

export default async function BookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bookings } = await supabase
    .from("stall_allocations")
    .select("id, status, final_price_paise, required_advance_paise, created_at, stalls(stall_number, events(name, event_date))")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Bookings" description="All your stall bookings across every event." />
      {!bookings || bookings.length === 0 ? (
        <EmptyState icon={Store} title="No bookings yet" description="Browse events to reserve your first stall." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Event</TH>
              <TH>Stall</TH>
              <TH>Date</TH>
              <TH>Amount</TH>
              <TH>Status</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {bookings.map((b: any) => (
              <TR key={b.id}>
                <TD className="font-medium text-navy-900">{b.stalls?.events?.name}</TD>
                <TD>{b.stalls?.stall_number}</TD>
                <TD>{formatDate(b.stalls?.events?.event_date)}</TD>
                <TD>{formatPaise(b.final_price_paise)}</TD>
                <TD><StatusPill status={b.status} /></TD>
                <TD>
                  <Link href={`/bookings/${b.id}`} className="text-sm font-medium text-royal-600">View</Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
