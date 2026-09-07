import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusPill } from "@/components/ui/badge";
import { formatDate, formatPaise, cn } from "@/lib/utils";
import { CalendarDays, Store, Wallet, LifeBuoy } from "lucide-react";
import { HomeHeader } from "@/components/dashboard/home-header";
import type { EventListing } from "@/types/domain";

const QUICK_LINKS: { label: string; href: string; icon: typeof CalendarDays; bg: string }[] = [
  { label: "Browse Events", href: "/events", icon: CalendarDays, bg: "bg-info-600" },
  { label: "My Bookings", href: "/bookings", icon: Store, bg: "bg-gold-600" },
  { label: "Wallet", href: "/wallet", icon: Wallet, bg: "bg-royal-500" },
  { label: "Support", href: "/support", icon: LifeBuoy, bg: "bg-error-600" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: bookings }, { data: upcoming }, { data: profile }] = await Promise.all([
    supabase
      .from("stall_allocations")
      .select("id, status, final_price_paise, required_advance_paise, stalls(stall_number, events(name, slug, event_date))")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("event_listing_v")
      .select("*")
      .in("status", ["upcoming", "registration_open"])
      .order("event_date", { ascending: true })
      .limit(4),
    supabase.from("profiles").select("full_name").eq("id", user!.id).single(),
  ]);

  const firstName = (profile?.full_name || user?.email?.split("@")[0] || "there").trim().split(" ")[0];
  const hour = Number(
    new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" })
  );
  const greetingKey = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const todayLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return (
    <div className="-mx-4 -mt-4 flex flex-col gap-7 rounded-b-[1.5rem] bg-navy-950 px-4 pb-7 pt-5 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8">
      <HomeHeader firstName={firstName} greetingKey={greetingKey} todayLabel={todayLabel} />

      <div>
        <h2 className="font-display text-base font-semibold text-white">Explore</h2>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {QUICK_LINKS.map(({ label, href, icon: Icon, bg }) => (
            <Link key={href} href={href} className="flex flex-col items-center gap-2 text-center">
              <span className={cn("flex h-14 w-14 items-center justify-center rounded-2xl text-white", bg)}>
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-[11px] font-medium leading-tight text-cloud-300">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-white">Upcoming Flea Markets</h2>
          <Link href="/events" className="text-xs font-semibold text-gold-400">
            View All
          </Link>
        </div>
        {!upcoming || upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-cloud-300">No upcoming events right now.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(upcoming as EventListing[]).map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.slug}`}
                className="flex flex-col gap-2 overflow-hidden rounded-[var(--radius-lg)] border border-navy-700 bg-navy-900 p-3 transition-colors hover:border-gold-500/60"
              >
                {e.banner_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote event banner, arbitrary host
                  <img src={e.banner_url} alt={e.name} className="-mx-3 -mt-3 h-20 w-[calc(100%+1.5rem)] object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-gold-400">
                    <Store className="h-5 w-5" />
                  </span>
                )}
                <p className="font-display text-sm font-semibold leading-snug text-white line-clamp-2">{e.name}</p>
                <p className="text-[11px] text-cloud-300">
                  {formatDate(e.event_date)}
                  {e.city ? ` · ${e.city}` : ""}
                </p>
                <p className="text-xs font-semibold text-gold-400">
                  {e.starting_price_paise != null
                    ? `From ${formatPaise(e.starting_price_paise)}`
                    : `${e.available_stalls ?? 0} stalls available`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-white">Your Stall Bookings</h2>
          <Link href="/bookings" className="text-xs font-semibold text-gold-400">
            View All
          </Link>
        </div>
        {!bookings || bookings.length === 0 ? (
          <div className="mt-3 rounded-[var(--radius-lg)] border border-dashed border-navy-700 bg-navy-900/50 px-4 py-8 text-center">
            <p className="text-sm text-cloud-300">No bookings yet — browse upcoming flea markets to book your first stall.</p>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase can't infer stalls() cardinality without a typed schema */}
            {bookings.map((b: any) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-[var(--radius-lg)] border border-navy-700 bg-navy-900 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {b.stalls?.events?.name} · Stall {b.stalls?.stall_number}
                  </p>
                  <p className="text-xs text-cloud-300">{formatDate(b.stalls?.events?.event_date)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-medium text-gold-400">{formatPaise(b.final_price_paise)}</span>
                  <StatusPill status={b.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
