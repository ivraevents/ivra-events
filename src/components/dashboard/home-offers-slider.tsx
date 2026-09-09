"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";

// Promotional "Offers" slider for the events you told us about — these are
// the venues/dates you gave us (Sept 2026), shown here with placeholder
// photos since real banners aren't uploaded yet. This is a marketing strip,
// separate from "Upcoming Markets" above (which reads live from your
// events table) — for these to become real, bookable listings with actual
// pricing and stall maps, add them as events in Admin -> Events; the card
// links to the events list either way.
const SLIDES = [
  {
    key: "godrej-avenue",
    date: "14 SEP",
    day: "Mon",
    venue: "Godrej Avenue",
    image: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=900&q=80",
  },
  {
    key: "rohan-upavana",
    date: "19 SEP",
    day: "Sat",
    venue: "Rohan Upavana",
    image: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=900&q=80",
  },
  {
    key: "ajmera-green-acre",
    date: "20 SEP",
    day: "Sun",
    venue: "Ajmera Green Acre",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80",
  },
];

export function HomeOffersSlider() {
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, [index]);

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Gift className="h-4 w-4 text-[#ffd83d]" />
        <h2 className="font-display text-base font-semibold text-white">Offers Running</h2>
      </div>

      <div
        ref={trackRef}
        className="[&::-webkit-scrollbar]:hidden mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none]"
        onScroll={(e) => {
          const el = e.currentTarget;
          const width = el.children[0]?.clientWidth || 1;
          const next = Math.round(el.scrollLeft / (width + 12));
          if (next !== index && next >= 0 && next < SLIDES.length) setIndex(next);
        }}
      >
        {SLIDES.map((s) => (
          <Link
            key={s.key}
            href="/events"
            className="relative flex h-40 w-[82%] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-[1.25rem] border border-[#242629] sm:w-[45%]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- demo/placeholder photo, not a real event banner */}
            <img src={s.image} alt={s.venue} className="absolute inset-0 h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-gradient-to-br from-[#ffe873] via-[#ffb23d] to-[#ff6a3d] px-2.5 py-1 text-[9px] font-bold text-[#08090a]">
              <Gift className="h-3 w-3" /> OFFER
            </span>
            <div className="relative p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#ffd83d]">
                {s.date} · {s.day}
              </p>
              <p className="mt-0.5 font-display text-sm font-bold text-white">{s.venue}</p>
              <p className="text-[10px] text-[#c7cacd]">Flea market · Stalls opening for booking</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-2.5 flex justify-center gap-1.5">
        {SLIDES.map((s, i) => (
          <span
            key={s.key}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index ? "w-4 bg-[#ffd83d]" : "w-1.5 bg-white/15"
            )}
          />
        ))}
      </div>
    </div>
  );
}
