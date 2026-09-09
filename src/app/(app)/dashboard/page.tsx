import { createClient } from "@/lib/supabase/server";
import { HomeHeader } from "@/components/dashboard/home-header";
import { HomeOffersSlider } from "@/components/dashboard/home-offers-slider";
import { HomeMarkets, type EventPricing } from "@/components/dashboard/home-markets";
import { HomeInstagramCard } from "@/components/dashboard/home-instagram-card";
import { HomeStatistics } from "@/components/dashboard/home-statistics";
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

  const hour = Number(
    new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" })
  );
  const greetingKey = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  return (
    <div className="relative -mx-4 -mt-4 overflow-hidden rounded-b-[1.5rem] bg-[#08090a] px-4 pb-8 pt-5 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8">
      {/* Clean, neutral ambient depth — soft white glows, not colored, so
          the page reads calm and premium (like the Navrathan reference)
          instead of tinting everything gold. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 -top-24 h-64 w-64 animate-pulse rounded-full bg-white/[0.04] blur-3xl [animation-duration:7s]" />
        <div className="absolute -right-20 top-10 h-72 w-72 animate-pulse rounded-full bg-white/[0.03] blur-3xl [animation-duration:9s]" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 animate-pulse rounded-full bg-white/[0.03] blur-3xl [animation-duration:8s]" />
      </div>

      <div className="relative flex flex-col gap-6">
        <HomeHeader greetingKey={greetingKey} firstName={firstName} />
        <HomeOffersSlider />
        <HomeMarkets events={events} pricing={pricing} />
        <HomeInstagramCard />
        <HomeStatistics />
      </div>
    </div>
  );
}
