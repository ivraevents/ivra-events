"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/locale-context";

/**
 * The dashboard's greeting card — just "Good Morning, {name}" + today's
 * date + a Browse Flea Markets button. Wallet used to have an "Add Fund"
 * chip here too, but that's now its own section (Wallet tab in the bottom
 * nav / sidebar) rather than living on the home screen.
 */
export function DashboardHero({
  todayLabel,
  greetingKey,
  firstName,
}: {
  todayLabel: string;
  greetingKey: "morning" | "afternoon" | "evening";
  firstName: string;
}) {
  const { t } = useLocale();

  return (
    <div className="rounded-[var(--radius-lg)] bg-navy-900 px-5 py-6 text-white sm:px-7 sm:py-8">
      <p className="text-xs font-medium text-cloud-300">{todayLabel}</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
        {t(`dashboard.greeting.${greetingKey}`)}, <span className="text-gold-400">{firstName}</span> 👋
      </h1>
      <p className="mt-2 text-sm text-cloud-300">{t("dashboard.subtitle")}</p>
      <div className="mt-5">
        <Button asChild variant="gold">
          <Link href="/events">
            {t("dashboard.browseFleaMarkets")} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
