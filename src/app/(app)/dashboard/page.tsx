import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { KpiCard, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { formatDate, formatPaise } from "@/lib/utils";
import { CalendarDays, Store, Wallet, ClipboardList } from "lucide-react";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: bookings }, { data: registrations }, { data: upcoming }, { data: profile }] = await Promise.all([
    supabase
      .from("stall_allocations")
      .select("id, status, final_price_paise, required_advance_paise, stalls(stall_number, events(name, slug, event_date))")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("registrations")
      .select("id, type, status, events(name)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("event_listing_v")
      .select("*")
      .in("status", ["upcoming", "registration_open"])
      .order("event_date", { ascending: true })
      .limit(3),
    supabase.from("profiles").select("full_name").eq("id", user!.id).single(),
  ]);

  const activeBookings = (bookings ?? []).filter((b) => !["cancelled", "completed"].includes(b.status));
  const pendingBalance = (bookings ?? []).reduce(
    (sum, b) => (b.status === "balance_pending" ? sum + (b.final_price_paise ?? 0) : sum),
    0
  );

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
    <div className="flex flex-col gap-8">
      <DashboardHero todayLabel={todayLabel} greetingKey={greetingKey} firstName={firstName} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active Bookings" value={activeBookings.length} icon={Store} tone="navy" />
        <KpiCard label="Registrations" value={registrations?.length ?? 0} icon={ClipboardList} tone="gold" />
        <KpiCard label="Balance Due" value={formatPaise(pendingBalance)} icon={Wallet} tone="warning" />
        <KpiCard label="Upcoming Events" value={upcoming?.length ?? 0} icon={CalendarDays} tone="success" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between p-5 pb-0">
            <h2 className="font-display text-lg font-semibold text-navy-900">Recent Bookings</h2>
            <Link href="/bookings" className="text-sm font-medium text-royal-600">View all</Link>
          </div>
          <CardContent>
            {!bookings || bookings.length === 0 ? (
              <EmptyState icon={Store} title="No bookings yet" description="Browse upcoming flea markets to book your first stall." />
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase can't infer stalls() cardinality without a typed schema */}
                {bookings.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-navy-900">
                        {b.stalls?.events?.name} · Stall {b.stalls?.stall_number}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(b.stalls?.events?.event_date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-navy-900">{formatPaise(b.final_price_paise)}</span>
                      <StatusPill status={b.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="p-5 pb-0">
            <h2 className="font-display text-lg font-semibold text-navy-900">Upcoming Flea Markets</h2>
          </div>
          <CardContent className="flex flex-col gap-3">
            {!upcoming || upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events right now.</p>
            ) : (
              upcoming.map((e) => (
                <Link
                  key={e.id}
                  href={`/events/${e.slug}`}
                  className="rounded-[var(--radius-md)] border border-border p-3 transition-colors hover:border-gold-400"
                >
                  <p className="text-sm font-semibold text-navy-900">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(e.event_date)} · {e.city}</p>
                  <p className="mt-1 text-xs font-medium text-gold-600">{e.available_stalls} stalls available</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
