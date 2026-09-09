"use client";

import { useLocale } from "@/lib/i18n/locale-context";

/**
 * Just the greeting — search now lives in the app's sticky header so it's
 * reachable from every screen, not only Home.
 */
export function HomeHeader({ greetingKey }: { greetingKey: "morning" | "afternoon" | "evening" }) {
  const { t } = useLocale();

  return (
    <div>
      <p className="text-sm text-cloud-300">
        {t(`dashboard.greeting.${greetingKey}`)} <span aria-hidden>👋</span>
      </p>
      <h1 className="mt-1 font-display text-[26px] font-bold leading-tight tracking-tight text-white sm:text-3xl">
        {t("dashboard.tagline1")} <span className="text-gold-400">{t("dashboard.tagline2")}</span> <span aria-hidden>✨</span>
      </h1>
    </div>
  );
}
