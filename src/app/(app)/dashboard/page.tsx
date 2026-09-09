import { createClient } from "@/lib/supabase/server";
import { HomeHeader } from "@/components/dashboard/home-header";
import { HomeOffersSlider } from "@/components/dashboard/home-offers-slider";
import { HomeMarkets, type EventPricing } from "@/components/dashboard/home-markets";
import { HomeInstagramCard } from "@/components/dashboard/home-instagram-card";
import { HomeTrustStrip } from "@/components/dashboard/home-trust-strip";
import type { EventListing } from "@/types/domain";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || null;

  const { data: upcoming } = await supabase
    .from("event_listing_v")
    .select("*")
    .in("status", ["upcoming", "registration_open"])
    .order("event_date", { ascending: true })
    .limit(6);

  const events = (upcoming ?? []) as EventListing[];
  const eventIds = events.map((e) => e.id);

  const pricing: Record<string, EventPricing> = {};
  if (eventIds.length > 0) {
    const { data: stallTypes } = await supabase
      .from("stall_types")
      .select("event_id, size_type, price_paise")
      .in("event_id", eventIds);
    for (const st of stallTypes ?? []) {
      const entry = (pricing[st.event_id] ??= {});
      const key = st.size_type as "half" | "full";
      entry[key] = entry[key] != null ? Math.min(entry[key]!, st.price_paise) : st.price_paise;
    }
  }

  // Trust strip — every number is a real, live count (no marketing
  // placeholders): stalls + stalls booked come straight from the public
  // event listing, verified customers from a SECURITY DEFINER RPC (0028)
  // since the underlying registrations table is select-own only.
  const { data: statsData } = await supabase.from("event_listing_v").select("total_stalls, available_stalls");
  const statsRows = (statsData ?? []) as Array<{ total_stalls: number; available_stalls: number }>;
  const totalStalls = statsRows.reduce((sum, r) => sum + (r.total_stalls ?? 0), 0);
  const stallsBooked = statsRows.reduce((sum, r) => sum + ((r.total_stalls ?? 0) - (r.available_stalls ?? 0)), 0);

  const { data: verifiedCustomers } = await supabase.rpc("get_verified_customer_count");

  const hour = Number(
    new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" })
  );
  const greetingKey = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  return (
    <div className="relative -mx-4 -mt-4 overflow-hidden rounded-b-[1.5rem] bg-[#08090a] px-4 pb-8 pt-5 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8">
      {/* Subtle "festive" ambient glow — soft, slow-pulsing color orbs behind
          the content. Pure CSS (no JS), positioned so they never sit under
          text or interactive elements, just tint the dark background. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 -top-24 h-64 w-64 animate-pulse rounded-full bg-[#ffb23d]/20 blur-3xl [animation-duration:6s]" />
        <div className="absolute -right-20 top-10 h-72 w-72 animate-pulse rounded-full bg-[#ff6a3d]/15 blur-3xl [animation-duration:8s]" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 animate-pulse rounded-full bg-[#ffd83d]/10 blur-3xl [animation-duration:7s]" />
      </div>

      <div className="relative flex flex-col gap-6">
        <HomeHeader greetingKey={greetingKey} firstName={firstName} />
        <HomeOffersSlider />
        <HomeMarkets events={events} pricing={pricing} />
        <HomeInstagramCard />
        <HomeTrustStrip
          totalStalls={totalStalls}
          verifiedCustomers={verifiedCustomers ?? 0}
          stallsBooked={stallsBooked}
        />
      </div>
    </div>
  );
}
