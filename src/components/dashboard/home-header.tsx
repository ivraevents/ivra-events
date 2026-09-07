"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";

/**
 * Home screen greeting + search — the two things at the very top of the
 * dark home screen. Search hands off to /events?q=..., which does the
 * actual filtering server-side.
 */
export function HomeHeader({
  firstName,
  greetingKey,
  todayLabel,
}: {
  firstName: string;
  greetingKey: "morning" | "afternoon" | "evening";
  todayLabel: string;
}) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const router = useRouter();

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/events?q=${encodeURIComponent(trimmed)}` : "/events");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-300">{todayLabel}</p>
        <p className="mt-1 text-sm text-cloud-300">
          {t(`dashboard.greeting.${greetingKey}`)}, <span className="font-semibold text-white">{firstName}</span> 👋
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">{t("dashboard.tagline")}</h1>
      </div>
      <form
        onSubmit={onSearch}
        className="flex items-center gap-3 rounded-full border border-navy-700 bg-navy-900 px-4 py-3"
      >
        <Search className="h-4 w-4 shrink-0 text-charcoal-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("dashboard.searchPlaceholder")}
          className="w-full bg-transparent text-sm text-white placeholder:text-charcoal-300 focus:outline-none"
        />
      </form>
    </div>
  );
}
