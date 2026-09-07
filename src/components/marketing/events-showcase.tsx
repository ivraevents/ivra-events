"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, MapPin, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PublicEvent {
  id: string;
  name: string;
  slug: string;
  banner_url: string | null;
  venue: string | null;
  city: string | null;
  event_date: string;
  end_date: string | null;
  status: string;
  available_stalls: number | null;
}

function dateBadge(dateStr: string) {
  const d = new Date(dateStr);
  return {
    month: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(d).toUpperCase(),
    day: new Intl.DateTimeFormat("en-IN", { day: "numeric" }).format(d),
  };
}

function fullDateLabel(event: PublicEvent) {
  const start = new Date(event.event_date);
  const startLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(start);
  if (!event.end_date || event.end_date === event.event_date) return startLabel;
  const endLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(
    new Date(event.end_date)
  );
  return `${startLabel} · Ends ${endLabel}`;
}

export function EventsShowcase({ events }: { events: PublicEvent[] }) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<string>("All Cities");

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) if (e.city) set.add(e.city);
    return ["All Cities", ...Array.from(set)];
  }, [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      const matchesCity = city === "All Cities" || e.city === city;
      const matchesQuery =
        !q ||
        e.name.toLowerCase().includes(q) ||
        (e.city ?? "").toLowerCase().includes(q) ||
        (e.venue ?? "").toLowerCase().includes(q);
      return matchesCity && matchesQuery;
    });
  }, [events, query, city]);

  return (
    <section id="events" className="bg-navy-950 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
          Upcoming Flea Markets
        </h2>
        <p className="mt-2 text-sm text-cloud-300">
          Find your next stall — search by event, city, or venue.
        </p>

        {/* Search */}
        <div className="mt-6 flex items-center gap-3 rounded-full border border-navy-700 bg-navy-900 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-charcoal-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, cities or venues"
            className="w-full bg-transparent text-sm text-white placeholder:text-charcoal-300 focus:outline-none"
          />
        </div>

        {/* City filter chips */}
        <div className="mt-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <p className="w-full shrink-0 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-charcoal-300 sm:hidden">
            Choose a city
          </p>
          {cities.map((c) => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
                city === c
                  ? "border-gold-500 bg-gold-500 text-navy-950"
                  : "border-navy-700 bg-navy-900 text-cloud-300 hover:border-gold-500/50"
              )}
            >
              {c !== "All Cities" && <MapPin className="mr-1 inline h-3 w-3" />}
              {c}
            </button>
          ))}
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="mt-10 rounded-[var(--radius-lg)] border border-dashed border-navy-700 bg-navy-900/50 px-6 py-16 text-center">
            <p className="font-display text-base font-semibold text-white">
              {events.length === 0 ? "No upcoming events right now" : "No events match your search"}
            </p>
            <p className="mt-1 text-sm text-cloud-300">
              {events.length === 0
                ? "Check back soon — new flea markets are added regularly."
                : "Try a different city or search term."}
            </p>
          </div>
        ) : (
          <div className="mt-6 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 [&>*]:snap-start">
            {filtered.map((event) => {
              const badge = dateBadge(event.event_date);
              const isOpen = event.status === "registration_open";
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="group flex w-[260px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-navy-700 bg-navy-900 transition-colors hover:border-gold-500/60 sm:w-[280px]"
                >
                  <div className="relative h-36 w-full overflow-hidden bg-navy-800">
                    {event.banner_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.banner_url}
                        alt={event.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <p className="text-xs text-charcoal-300">Event image coming soon</p>
                      </div>
                    )}
                    <div className="absolute left-3 top-3 flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-white/95 leading-none shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-gold-600">
                        {badge.month}
                      </span>
                      <span className="text-sm font-bold text-navy-900">{badge.day}</span>
                    </div>
                    {isOpen && (
                      <span className="absolute right-3 top-3 rounded-full bg-gold-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-navy-950">
                        Applications open
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <p className="font-display text-base font-semibold leading-snug text-white line-clamp-2">
                      {event.name}
                    </p>
                    <p className="text-xs text-cloud-300">{fullDateLabel(event)}</p>
                    {(event.venue || event.city) && (
                      <p className="flex items-center gap-1 text-xs text-cloud-300">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {[event.venue, event.city].filter(Boolean).join(", ")}
                        </span>
                      </p>
                    )}
                    {typeof event.available_stalls === "number" && (
                      <p className="flex items-center gap-1 text-xs font-medium text-gold-400">
                        <Store className="h-3 w-3" /> {event.available_stalls} stalls available
                      </p>
                    )}
                    <Button asChild variant="gold" size="sm" className="mt-2">
                      <span>View Event</span>
                    </Button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
