"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import type { Locale } from "@/lib/i18n/translations";

const INTL_LOCALE: Record<Locale, string> = { en: "en-IN", hi: "hi-IN", kn: "kn-IN" };

/**
 * Home hero: date line, personalized greeting, short tagline. Search lives
 * in the app's sticky header (reachable from every screen), and the
 * bell/avatar live there too — so this stays greeting-only rather than
 * duplicating those controls inside the hero.
 */
export function HomeHeader({
  greetingKey,
  firstName,
}: {
  greetingKey: "morning" | "afternoon" | "evening";
  firstName: string | null;
}) {
  const { t, locale } = useLocale();

  const dateLabel = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div>
      <p className="text-xs font-medium text-charcoal-300">{dateLabel}</p>
      <h1 className="mt-2 font-display text-[26px] font-bold leading-tight tracking-tight text-white sm:text-3xl">
        {t(`dashboard.greeting.${greetingKey}`)}
        {firstName ? (
          <>
            , <span className="text-gold-400">{firstName}</span>
          </>
        ) : null}{" "}
        <span aria-hidden>👋</span>
      </h1>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-cloud-300">{t("dashboard.subtitle")}</p>
    </div>
  );
}
