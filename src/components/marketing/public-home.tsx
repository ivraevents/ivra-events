"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LocaleProvider, useLocale } from "@/lib/i18n/locale-context";
import { PublicHeader } from "./public-header";
import { SiteFooter } from "./site-footer";
import { EventsShowcase, type PublicEvent } from "./events-showcase";
import { StatsSection } from "./stats-section";
import { InstagramBanner } from "./instagram-banner";

function PublicHomeContent({ events }: { events: PublicEvent[] }) {
  const { t } = useLocale();

  return (
    <div className="flex min-h-screen flex-col bg-navy-950">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-16 text-center sm:px-6 sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(201,152,47,0.25), transparent 45%), radial-gradient(circle at 85% 60%, rgba(29,132,73,0.35), transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-2xl">
          <span className="inline-flex items-center rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1.5 text-xs font-semibold text-gold-400">
            {t("hero.badge")}
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mt-4 text-sm text-cloud-300 sm:text-base">{t("hero.subtitle")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="gold" size="lg" className="w-full sm:w-auto">
              <Link href="#events">{t("hero.browseEvents")}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full border-cloud-300/30 bg-transparent text-white hover:bg-white/10 sm:w-auto"
            >
              <Link href="/login">{t("hero.signIn")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <EventsShowcase events={events} />
      <InstagramBanner />
      <StatsSection />
      <SiteFooter />
    </div>
  );
}

export function PublicHome({ events }: { events: PublicEvent[] }) {
  return (
    <LocaleProvider>
      <PublicHomeContent events={events} />
    </LocaleProvider>
  );
}
