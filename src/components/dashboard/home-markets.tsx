"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, CalendarDays, Users, ArrowUpRight, ArrowRight } from "lucide-react";
import { cn, formatPaise } from "@/lib/utils";
import type { EventListing } from "@/types/domain";

export interface EventPricing {
  half?: number;
  full?: number;
}

function dateBadge(dateStr: string) {
  const d = new Date(dateStr);
  return {
    month: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(d).toUpperCase(),
    day: new Intl.DateTimeFormat("en-IN", { day: "numeric" }).format(d),
    weekday: new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(d).toUpperCase(),
  };
}

function dateRangeLabel(event: EventListing) {
  const start = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(
    new Date(event.event_date)
  );
  if (!event.end_date || event.end_date === event.event_date) return start;
  const end = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(event.end_date));
  return `${start} · Ends ${end}`;
}

function statusMeta(status: string) {
  if (status === "registration_open") return { label: "Booking Open", tone: "bg-[#43e59a]" };
  return { label: "Opening Soon", tone: "bg-[#ffd83d]" };
}

/**
 * Home screen's "Choose a City" filter + "Upcoming Markets" cards —
 * everything client-side over the small set of events Home fetches, so
 * picking a city re-filters instantly with no page reload.
 */
export function HomeMarkets({ events, pricing }: { events: EventListing[]; pricing: Record<string, EventPricing> }) {
  const allCitiesLabel = "All Cities";
  const [city, setCity] = useState(allCitiesLabel);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) if (e.city) set.add(e.city);
    return [allCitiesLabel, ...Array.from(set)];
  }, [events]);

  const filtered = useMemo(
    () => (city === allCitiesLabel ? events : events.filter((e) => e.city === city)),
    [events, city]
  );

  return (
    <div className="flex flex-col gap-6">
      {cities.length > 2 && (
        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-white">Choose a City</h2>
          </div>
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {cities.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCity(c)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-colors",
                  city === c
                    ? "border-white bg-white text-[#08090a]"
                    : "border-[#242629] bg-[#131518] text-[#a2a5a8] hover:border-[#ffd83d]/50"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-white">Upcoming Markets 🔥</h2>
          <Link href="/events" className="text-xs font-semibold text-[#ffd83d]">
            See all →
          </Link>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-3 text-sm text-[#a2a5a8]">No markets in {city} right now — try another city.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {filtered.map((event) => {
              const badge = dateBadge(event.event_date);
              const status = statusMeta(event.status);
              const price = pricing[event.id];
              return (
                <div
                  key={event.id}
                  className="overflow-hidden rounded-[1.25rem] border border-[#242629] bg-[#131518] shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                >
                  <div className="relative h-44 w-full bg-[#191b1e]">
                    {event.banner_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote event banner, arbitrary host
                      <img src={event.banner_url} alt={event.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[#75797d]">
                        Event image coming soon
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />
                    <div className="absolute left-3 top-3 flex flex-col items-center rounded-xl border border-white/15 bg-black/70 px-2.5 py-1.5 leading-none">
                      <span className="text-[8px] font-bold uppercase tracking-wide text-[#ffd83d]">{badge.month}</span>
                      <span className="text-lg font-bold text-white">{badge.day}</span>
                      <span className="text-[7px] text-[#a2a5a8]">{badge.weekday}</span>
                    </div>
                    <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/70 px-2.5 py-1 text-[9px] font-semibold text-white">
                      Event
                    </span>
                    <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-2.5 py-1 text-[9px] font-medium text-white">
                      <span className={cn("h-1.5 w-1.5 rounded-full", status.tone)} /> {status.label}
                    </span>
                  </div>

                  <div className="p-4">
                    <p className="font-display text-base font-bold leading-snug text-white">{event.name}</p>
                    <p className="mt-3 flex items-center gap-2.5 text-[11px] text-[#a2a5a8]">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#191b1e]">
                        <CalendarDays className="h-3.5 w-3.5" />
                      </span>
                      {dateRangeLabel(event)}
                    </p>
                    {(event.venue || event.city) && (
                      <p className="mt-2 flex items-center gap-2.5 text-[11px] text-[#a2a5a8]">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#191b1e]">
                          <MapPin className="h-3.5 w-3.5" />
                        </span>
                        {[event.venue, event.city].filter(Boolean).join(", ")}
                      </p>
                    )}
                    <p className="mt-2 flex items-center gap-2.5 text-[11px] text-[#a2a5a8]">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#191b1e]">
                        <Users className="h-3.5 w-3.5" />
                      </span>
                      {event.available_stalls} of {event.total_stalls} stalls available
                    </p>

                    {(price?.half != null || price?.full != null) && (
                      <>
                        <p className="mt-4 text-[10px] font-medium uppercase tracking-wide text-[#75797d]">
                          Stall Pricing
                        </p>
                        <div className={cn("mt-1.5 grid gap-2", price.half != null && price.full != null ? "grid-cols-2" : "grid-cols-1")}>
                          {price.half != null && (
                            <div className="rounded-xl border border-[#242629] bg-[#191b1e] px-3 py-2">
                              <p className="text-[9px] text-[#75797d]">Half Stall</p>
                              <p className="text-sm font-bold text-white">{formatPaise(price.half)}</p>
                            </div>
                          )}
                          {price.full != null && (
                            <div className="rounded-xl border border-[#242629] bg-[#191b1e] px-3 py-2">
                              <p className="text-[9px] text-[#75797d]">Full Stall</p>
                              <p className="text-sm font-bold text-white">{formatPaise(price.full)}</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <div className="mt-3.5 grid grid-cols-[1fr_1.35fr] gap-2">
                      <Link
                        href={`/events/${event.slug}`}
                        className="flex h-11 items-center justify-center gap-1 rounded-xl border border-[#242629] bg-[#191b1e] text-xs font-bold text-white"
                      >
                        View Details <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href={`/events/${event.slug}`}
                        className="flex h-11 items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-[#ffd83d] to-[#ff9135] text-xs font-bold text-[#08090a]"
                      >
                        BOOK IT <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
