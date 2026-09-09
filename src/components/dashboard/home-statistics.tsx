"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Store, Ticket, ShieldCheck, type LucideIcon } from "lucide-react";

/** Animates 0 -> target once on mount — the "running" counter effect. */
function useCountUp(target: number, durationMs = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

function StatCard({ icon: Icon, target, label }: { icon: LucideIcon; target: number; label: string }) {
  const value = useCountUp(target);
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#242629] bg-[#131518] px-3 py-4 text-center">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ffd83d]/25 bg-[#ffd83d]/10">
        <Icon className="h-4 w-4 text-[#ffd83d]" />
      </span>
      <span className="font-display text-xl font-black tracking-tight text-white">
        {value.toLocaleString("en-IN")}
        {target > 0 && "+"}
      </span>
      <span className="h-0.5 w-5 rounded-full bg-gradient-to-r from-[#ffe873] via-[#ffb23d] to-[#ff6a3d]" />
      <span className="text-[10px] font-medium leading-tight text-[#75797d]">{label}</span>
    </div>
  );
}

/**
 * "Our Statistics" section — same badge + heading + 4-card layout as the
 * reference design, but every number is real and live from the database
 * (no marketing placeholders like "10,000+ Footfall" or "98% Satisfaction").
 * Add or update events, stalls and registrations in Admin and these counts
 * update on their own — nothing here is typed in by hand.
 */
export function HomeStatistics({
  totalEvents,
  totalStalls,
  stallsBooked,
  verifiedCustomers,
}: {
  totalEvents: number;
  totalStalls: number;
  stallsBooked: number;
  verifiedCustomers: number;
}) {
  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ffd83d]/25 bg-[#ffd83d]/10 px-3 py-1 text-[10px] font-semibold text-[#ffd83d]">
          📊 Live Platform Stats
        </span>
        <h2 className="mt-2.5 font-display text-xl font-bold text-white">
          Our <span className="text-[#ffd83d]">Statistics</span>
        </h2>
        <p className="mt-1 text-xs text-[#a2a5a8]">Connecting vendors with events across India</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={CalendarDays} target={totalEvents} label="Events Hosted" />
        <StatCard icon={Store} target={totalStalls} label="Stalls Listed" />
        <StatCard icon={Ticket} target={stallsBooked} label="Stalls Booked" />
        <StatCard icon={ShieldCheck} target={verifiedCustomers} label="Verified Customers" />
      </div>
    </div>
  );
}
