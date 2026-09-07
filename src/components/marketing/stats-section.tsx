"use client";

import { CalendarDays, Users, TrendingUp, ShieldCheck } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";

/**
 * Placeholder figures — swap these for real numbers once you have them
 * (Admin → Reports will eventually be the source of truth).
 */
const STATS = [
  { key: "stats.eventsHosted", value: "10+", icon: CalendarDays },
  { key: "stats.registeredVendors", value: "200+", icon: Users },
  { key: "stats.stallsBooked", value: "500+", icon: TrendingUp },
  { key: "stats.vendorSatisfaction", value: "98%", icon: ShieldCheck },
];

export function StatsSection() {
  const { t } = useLocale();

  return (
    <section className="bg-surface-muted">
      <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-semibold text-royal-600">
          {t("stats.eyebrow")}
        </span>
        <h2 className="mt-4 font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
          {t("stats.headingPlain")} <span className="text-gold-600">{t("stats.headingAccent")}</span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("stats.subheading")}</p>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {STATS.map(({ key, value, icon: Icon }) => (
            <div
              key={key}
              className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
            >
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-navy-900/5 text-navy-900">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
                {value}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">{t(key)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
