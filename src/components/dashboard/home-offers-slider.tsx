"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gift, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Promotional "Offers" slider for the events you told us about — these are
// the venues/dates you gave us (Sept 2026). Cards are drawn with code (a
// gradient + icon watermark), not stock photos — a random stock image would
// misrepresent what the venue actually looks like. Real photos belong in
// "Upcoming Markets" below, which reads live from your events table — for
// these three to become real, bookable listings with pricing and stall
// maps, add them as events in Admin -> Events; "Book Now" links to the
// events list either way.
const SLIDES = [
  { key: "godrej-avenue", date: "14 SEP", day: "Mon", venue: "Godrej Avenue" },
  { key: "rohan-upavana", date: "19 SEP", day: "Sat", venue: "Rohan Upavana" },
  { key: "ajmera-green-acre", date: "20 SEP", day: "Sun", venue: "Ajmera Green Acre" },
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
          <div
            key={s.key}
            className="relative flex h-40 w-[82%] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[1.25rem] border border-[#242629] bg-[#131518] p-3.5 sm:w-[45%]"
          >
            {/* Decorative code-drawn backdrop, not a stock photo. */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-[#ffe873]/20 via-[#ffb23d]/10 to-transparent blur-2xl" />
              <Gift className="absolute -bottom-4 -right-4 h-24 w-24 text-white/[0.04]" />
            </div>

            <div className="relative flex items-start justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#ffd83d]">
                {s.date} · {s.day}
              </p>
              <span className="flex items-center gap-1 rounded-full bg-gradient-to-br from-[#ffe873] via-[#ffb23d] to-[#ff6a3d] px-2.5 py-1 text-[9px] font-bold text-[#08090a]">
                <Gift className="h-3 w-3" /> OFFER
              </span>
            </div>

            <div className="relative">
              <p className="font-display text-base font-bold text-white">{s.venue}</p>
              <p className="mt-0.5 text-[10px] text-[#a2a5a8]">Flea market · Stalls opening for booking</p>
              <Link
                href="/events"
                className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-3 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-white/[0.14]"
              >
                Book Now <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
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
