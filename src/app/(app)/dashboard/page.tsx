import { createClient } from "@/lib/supabase/server";
import { HomeHeader } from "@/components/dashboard/home-header";
import { HomeMarkets, type EventPricing } from "@/components/dashboard/home-markets";
import { HomeInstagramCard } from "@/components/dashboard/home-instagram-card";
import type { EventListing } from "@/types/domain";

export default async function DashboardPage() {
  const supabase = await createClient();

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
    <div className="-mx-4 -mt-4 flex flex-col gap-6 rounded-b-[1.5rem] bg-navy-950 px-4 pb-8 pt-5 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8">
      <HomeHeader greetingKey={greetingKey} />
      <HomeMarkets events={events} pricing={pricing} />
      <HomeInstagramCard />
    </div>
  );
}
