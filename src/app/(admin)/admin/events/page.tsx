import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusPill, Badge } from "@/components/ui/badge";
import { NewEventDialog } from "./new-event-dialog";
import { DuplicateEventButton } from "./duplicate-button";
import { formatDate } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("event_listing_v")
    .select("*")
    .order("event_date", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Events" description="Create and manage flea market events." actions={<NewEventDialog />} />
      {!events || events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No events yet" action={<NewEventDialog />} />
      ) : (
        <Table>
          <THead>
            <TR><TH>Name</TH><TH>Date</TH><TH>City</TH><TH>Stall Type</TH><TH>Stalls</TH><TH>Status</TH><TH /></TR>
          </THead>
          <TBody>
            {events.map((e) => (
              <TR key={e.id}>
                <TD>
                  <Link href={`/admin/events/${e.id}`} className="font-medium text-navy-900 hover:text-royal-600">{e.name}</Link>
                </TD>
                <TD>{formatDate(e.event_date)}</TD>
                <TD>{e.city}</TD>
                <TD><Badge tone={e.stall_mode === "unfixed" ? "info" : "neutral"}>{e.stall_mode === "unfixed" ? "Unfixed" : "Fixed"}</Badge></TD>
                <TD>{e.available_stalls} / {e.total_stalls} available</TD>
                <TD><StatusPill status={e.status} /></TD>
                <TD><DuplicateEventButton eventId={e.id} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
