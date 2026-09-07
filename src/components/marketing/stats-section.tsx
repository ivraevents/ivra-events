import { CalendarDays, Users, TrendingUp, ShieldCheck } from "lucide-react";

/**
 * Placeholder figures — swap these for real numbers once you have them
 * (Admin → Reports will eventually be the source of truth).
 */
const STATS = [
  { label: "Events Hosted", value: "10+", icon: CalendarDays },
  { label: "Registered Vendors", value: "200+", icon: Users },
  { label: "Stalls Booked", value: "500+", icon: TrendingUp },
  { label: "Vendor Satisfaction", value: "98%", icon: ShieldCheck },
];

export function StatsSection() {
  return (
    <section className="bg-surface-muted">
      <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-semibold text-royal-600">
          Trusted by vendors across India
        </span>
        <h2 className="mt-4 font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
          Our <span className="text-gold-600">Statistics</span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Connecting vendors with flea markets across India.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {STATS.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
            >
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-navy-900/5 text-navy-900">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
                {value}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
