"use client";

import { useEffect, useState } from "react";
import { Store, ShieldCheck, Ticket, type LucideIcon } from "lucide-react";

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

function StatItem({ icon: Icon, target, label }: { icon: LucideIcon; target: number; label: string }) {
  const value = useCountUp(target);
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 px-1.5 text-center">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ffd83d]/25 bg-[#ffd83d]/10">
        <Icon className="h-3.5 w-3.5 text-[#ffd83d]" />
      </span>
      <span className="font-display text-lg font-black tracking-tight text-white sm:text-xl">
        {value.toLocaleString("en-IN")}
        {target > 0 && "+"}
      </span>
      <span className="text-[9px] font-semibold leading-tight text-[#75797d]">{label}</span>
    </div>
  );
}

/**
 * Single-row "trusted by" strip — every count is a real, live number (no
 * marketing placeholders): total stalls and stalls booked come from the
 * public event listing, verified customers from the get_verified_customer_
 * count() RPC (registrations approved via KYC review). Thin-line icons
 * instead of emoji, for a more minimal, premium feel.
 */
export function HomeTrustStrip({
  totalStalls,
  verifiedCustomers,
  stallsBooked,
}: {
  totalStalls: number;
  verifiedCustomers: number;
  stallsBooked: number;
}) {
  return (
    <div className="flex items-stretch justify-between divide-x divide-white/10 rounded-[1.25rem] border border-[#242629] bg-[#131518] px-2 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <StatItem icon={Store} target={totalStalls} label="Stalls" />
      <StatItem icon={ShieldCheck} target={verifiedCustomers} label="Verified Customers" />
      <StatItem icon={Ticket} target={stallsBooked} label="Stalls Booked" />
    </div>
  );
}
