"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Store, ShieldCheck, type LucideIcon } from "lucide-react";

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
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#43e59a]/25 bg-[#43e59a]/10">
        <Icon className="h-4 w-4 text-[#43e59a]" />
      </span>
      <span className="font-display text-xl font-black tracking-tight text-white">
        {value.toLocaleString("en-IN")}
        {target > 0 && "+"}
      </span>
      <span className="h-0.5 w-5 rounded-full bg-gradient-to-r from-[#8ff5c4] via-[#43e59a] to-[#0e9f6e]" />
      <span className="text-[10px] font-medium leading-tight text-[#75797d]">{label}</span>
    </div>
  );
}

// These three figures are the business's own track record across its
// offline markets over the years — stated directly by the owner, not a
// live database count (the app itself is new, so its own event/stall
// tables don't yet reflect years of history). Update the numbers here if
// the owner gives revised figures; there's nothing elsewhere to keep in
// sync since they aren't derived from any table.
const EVENTS_HOSTED = 2000;
const STALLS_LISTED = 5000;
const TRUSTED_CUSTOMERS = 9000;

/**
 * "Our Statistics" section — badge, heading and 3-card layout, styled to
 * match the reference design.
 */
export function HomeStatistics() {
  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#43e59a]/25 bg-[#43e59a]/10 px-3 py-1 text-[10px] font-semibold text-[#43e59a]">
          📊 Trusted by Thousands
        </span>
        <h2 className="mt-2.5 font-display text-xl font-bold text-white">
          Our <span className="text-[#43e59a]">Statistics</span>
        </h2>
        <p className="mt-1 text-xs text-[#a2a5a8]">Connecting vendors with events across India</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatCard icon={CalendarDays} target={EVENTS_HOSTED} label="Events Hosted" />
        <StatCard icon={Store} target={STALLS_LISTED} label="Stalls Listed" />
        <StatCard icon={ShieldCheck} target={TRUSTED_CUSTOMERS} label="Trusted" />
      </div>
    </div>
  );
}
