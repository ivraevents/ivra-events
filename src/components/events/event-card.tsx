import Link from "next/link";
import Image from "next/image";
import { MapPin, CalendarDays, Store } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatPaise } from "@/lib/utils";
import type { EventListing } from "@/types/domain";

export function EventCard({ event }: { event: EventListing }) {
  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-elevated)]">
      <div className="relative h-40 w-full bg-navy-900">
        {event.banner_url ? (
          <Image src={event.banner_url} alt={event.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy-900 to-navy-700">
            <Image src="/brand/logo-mark.png" alt="" width={56} height={56} className="opacity-70" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <StatusPill status={event.status} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-lg font-semibold text-navy-900">{event.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> {formatDate(event.event_date)}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {event.venue}{event.city ? `, ${event.city}` : ""}
          </p>
        </div>
        <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-surface-muted px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 text-charcoal-700">
            <Store className="h-3.5 w-3.5" /> {event.available_stalls} / {event.total_stalls} available
          </span>
          <span className="font-semibold text-gold-600">From {formatPaise(event.starting_price_paise)}</span>
        </div>
        <Button asChild className="mt-auto">
          <Link href={`/events/${event.slug}`}>View Stalls</Link>
        </Button>
      </div>
    </Card>
  );
}
