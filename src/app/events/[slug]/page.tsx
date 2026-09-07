import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { EventDetailClient } from "./event-detail-client";
import { formatDate } from "@/lib/utils";
import { CalendarDays, MapPin, Clock } from "lucide-react";
import type { Category, Stall } from "@/types/domain";

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase.from("events").select("*").eq("slug", slug).single();
  if (!event) notFound();

  const [{ data: stalls }, { data: categories }] = await Promise.all([
    supabase
      .from("stalls")
      .select("*, stall_type:stall_types(*)")
      .eq("event_id", event.id)
      .order("stall_number"),
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={event.name}
        description={event.description}
        actions={<StatusPill status={event.status} />}
      />

      <Card>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <span className="flex items-center gap-2 text-charcoal-700">
            <CalendarDays className="h-4 w-4 text-gold-600" /> {formatDate(event.event_date)}
          </span>
          <span className="flex items-center gap-2 text-charcoal-700">
            <MapPin className="h-4 w-4 text-gold-600" /> {event.venue}, {event.city}
          </span>
          {event.start_time && (
            <span className="flex items-center gap-2 text-charcoal-700">
              <Clock className="h-4 w-4 text-gold-600" /> {event.start_time} – {event.end_time}
            </span>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-navy-900">Stall Map</h2>
        <EventDetailClient
          stalls={(stalls as unknown as Stall[]) ?? []}
          categories={(categories as Category[]) ?? []}
        />
      </div>

      {event.terms_and_conditions && (
        <Card>
          <CardContent>
            <h3 className="mb-2 font-display text-base font-semibold text-navy-900">Terms &amp; Conditions</h3>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{event.terms_and_conditions}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
