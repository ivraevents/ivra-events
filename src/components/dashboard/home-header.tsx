"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Locale } from "@/lib/i18n/translations";

const INTL_LOCALE: Record<Locale, string> = { en: "en-IN", hi: "hi-IN", kn: "kn-IN" };

/**
 * Home hero: date line, personalized greeting, tagline, and — right below
 * the greeting, where it's impossible to miss — the search bar. Search used
 * to live only in the sticky header, but that read as too subtle, so it now
 * lives here instead (not duplicated in the header too).
 */
export function HomeHeader({
  greetingKey,
  firstName,
}: {
  greetingKey: "morning" | "afternoon" | "evening";
  firstName: string | null;
}) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const dateLabel = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/events?q=${encodeURIComponent(trimmed)}` : "/events");
  }

  return (
    <div>
      <p className="text-xs font-medium text-[#75797d]">{dateLabel}</p>
      <h1 className="mt-2 font-display text-[26px] font-bold leading-tight tracking-tight text-white sm:text-3xl">
        {t(`dashboard.greeting.${greetingKey}`)}
        {firstName ? (
          <>
            , <span className="text-[#ffd83d]">{firstName}</span>
          </>
        ) : null}{" "}
        <span aria-hidden>👋</span>
      </h1>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#a2a5a8]">{t("dashboard.subtitle")}</p>

      <form
        onSubmit={onSubmit}
        className="mt-5 flex items-center gap-2.5 rounded-2xl bg-[#e9ebed] py-1 pl-4 pr-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.3)]"
      >
        <Search className="h-[18px] w-[18px] shrink-0 text-[#131518]/60" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("dashboard.searchPlaceholder")}
          className="h-[52px] w-full min-w-0 bg-transparent text-sm text-[#08090a] placeholder:text-[#75797d] focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Search"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffe873] via-[#ffb23d] to-[#ff6a3d] text-[#08090a] shadow-[0_4px_14px_rgba(255,178,61,0.45)] transition-transform active:scale-95"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>
      </form>
    </div>
  );
}
