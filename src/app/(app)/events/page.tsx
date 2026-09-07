import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { EventCard } from "@/components/events/event-card";
import { CalendarX } from "lucide-react";
import type { EventListing } from "@/types/domain";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("event_listing_v")
    .select("*")
    .in("status", ["upcoming", "registration_open", "registration_closed", "ongoing"])
    .order("event_date", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Upcoming Flea Markets" description="Pick an event to view stalls and availability." />

      {!events || events.length === 0 ? (
        <EmptyState icon={CalendarX} title="No events right now" description="Check back soon for new flea markets." />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(events as EventListing[]).map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
