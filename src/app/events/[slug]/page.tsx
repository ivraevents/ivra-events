import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventDetailClient } from "./event-detail-client";
import { formatDate } from "@/lib/utils";
import { computeCapacitySummary } from "@/lib/stall-capacity";
import { CalendarDays, MapPin, Clock, Navigation, Users, Store } from "lucide-react";
import type { Category, Stall, StallType } from "@/types/domain";

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase.from("events").select("*").eq("slug", slug).single();
  if (!event) notFound();

  const [{ data: stalls }, { data: stallTypes }, { data: categories }] = await Promise.all([
    supabase
      .from("stalls")
      .select("*, stall_type:stall_types(*)")
      .eq("event_id", event.id)
      .order("stall_number"),
    supabase.from("stall_types").select("*").eq("event_id", event.id),
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
  ]);

  const summary = computeCapacitySummary({
    stallMode: event.stall_mode,
    totalStallCapacity: event.total_stall_capacity,
    fullStallUnitRatio: event.full_stall_unit_ratio ?? 2,
    stalls: (stalls ?? []).map((s) => ({ id: s.id, stall_type_id: s.stall_type_id, status: s.status })),
    stallTypes: (stallTypes as StallType[]) ?? [],
  });
  const halfType = (stallTypes as StallType[] | null)?.find((t) => t.size_type === "half" && t.monopoly_type === "non_monopoly");
  const fullType = (stallTypes as StallType[] | null)?.find((t) => t.size_type === "full" && t.monopoly_type === "non_monopoly");

  return (
    <div className="flex flex-col gap-6">
      {event.banner_url && (
        // eslint-disable-next-line @next/next/no-img-element -- remote/storage banner, arbitrary host
        <img
          src={event.banner_url}
          alt={event.name}
          className="h-48 w-full rounded-[var(--radius-lg)] object-cover sm:h-64"
        />
      )}

      <PageHeader
        title={event.name}
        description={event.description}
        actions={<StatusPill status={event.status} />}
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
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
          {summary.totalCapacity > 0 && (
            <span className="flex items-center gap-2 text-charcoal-700">
              <Store className="h-4 w-4 text-gold-600" />
              {event.stall_mode === "unfixed"
                ? `${summary.overallRemaining} of ${summary.totalCapacity} capacity remaining`
                : `${summary.halfBooked + summary.fullBooked} of ${summary.totalCapacity} stalls occupied`}
            </span>
          )}
          {event.expected_crowd && (
            <span className="flex items-center gap-2 text-charcoal-700">
              <Users className="h-4 w-4 text-gold-600" /> {event.expected_crowd} expected
            </span>
          )}
          {event.maps_url && (
            <Button asChild variant="outline" size="sm" className="ml-auto">
              <Link href={event.maps_url} target="_blank" rel="noopener noreferrer">
                <Navigation className="h-3.5 w-3.5" /> Get Directions
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-navy-900">
          {event.stall_mode === "unfixed" ? "Book a Stall" : "Stall Map"}
        </h2>
        <EventDetailClient
          stalls={(stalls as unknown as Stall[]) ?? []}
          categories={(categories as Category[]) ?? []}
          openMode={
            event.stall_mode === "unfixed"
              ? {
                  eventId: event.id,
                  halfPricePaise: halfType?.price_paise ?? null,
                  fullPricePaise: fullType?.price_paise ?? null,
                  halfAvailable: summary.halfAvailable,
                  fullAvailable: summary.fullAvailable,
                }
              : undefined
          }
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
