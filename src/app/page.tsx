import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { AddToHomeScreenBanner } from "@/components/layout/add-to-home-screen-banner";
import { HomeHeader } from "@/components/dashboard/home-header";
import { HomeOffersSlider } from "@/components/dashboard/home-offers-slider";
import { HomeMarkets, type EventPricing } from "@/components/dashboard/home-markets";
import { HomeInstagramCard } from "@/components/dashboard/home-instagram-card";
import { HomeStatistics } from "@/components/dashboard/home-statistics";
import type { EventListing } from "@/types/domain";

// The Home screen — search, offers, upcoming markets — is public. Anyone
// who opens the link sees this directly (no marketing/hero page, no forced
// sign-in first): a "Register / Sign In" button lives right in the header
// for people who want to book/register, and the account-only areas of the
// app (Wallet, My Bookings, Profile, …) still ask a signed-out visitor to
// sign in the moment they actually tap into one of those — same as before,
// just no longer gating the Home screen itself.
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let firstName: string | null = null;
  let userLabel = "";
  let userEmail = "";
  let hideProvideSection = false;

  if (user) {
    const [{ data: profile }, { data: vendorRegistration }] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("id", user.id).single(),
      // Stall vendors and canopy/game providers are separate vendor types —
      // once someone has registered a stall, hide the canopy/game options.
      supabase.from("registrations").select("id").eq("user_id", user.id).eq("type", "vendor").limit(1).maybeSingle(),
    ]);
    firstName = profile?.full_name?.trim().split(/\s+/)[0] || null;
    userLabel = profile?.full_name || profile?.email || "Account";
    userEmail = profile?.email || user.email || "";
    hideProvideSection = !!vendorRegistration;
  }

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
    <AppShell
      navKind="user"
      userLabel={userLabel}
      userEmail={userEmail}
      hideProvideSection={hideProvideSection}
      guest={!user}
    >
      <div className="relative -mx-4 -mt-4 overflow-hidden rounded-b-[1.5rem] bg-[#08090a] px-4 pb-8 pt-5 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8">
        {/* Clean, neutral ambient depth — soft white glows, not colored, so
            the page reads calm and premium instead of tinting everything
            gold. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 -top-24 h-64 w-64 animate-pulse rounded-full bg-white/[0.04] blur-3xl [animation-duration:7s]" />
          <div className="absolute -right-20 top-10 h-72 w-72 animate-pulse rounded-full bg-white/[0.03] blur-3xl [animation-duration:9s]" />
          <div className="absolute bottom-0 left-1/3 h-56 w-56 animate-pulse rounded-full bg-white/[0.03] blur-3xl [animation-duration:8s]" />
        </div>

        <div className="relative flex flex-col gap-6">
          <AddToHomeScreenBanner />
          <HomeHeader greetingKey={greetingKey} firstName={firstName} />
          <HomeOffersSlider />
          <HomeMarkets events={events} pricing={pricing} />
          <HomeInstagramCard />
          <HomeStatistics />
        </div>
      </div>
    </AppShell>
  );
}
