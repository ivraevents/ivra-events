"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { LOCALES } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center rounded-full border border-navy-700 bg-navy-900 p-0.5 text-xs font-semibold">
      {LOCALES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          aria-pressed={locale === l.code}
          className={cn(
            "rounded-full px-2.5 py-1.5 transition-colors",
            locale === l.code ? "bg-gold-500 text-navy-950" : "text-cloud-300 hover:text-white"
          )}
        >
          {l.native}
        </button>
      ))}
    </div>
  );
}
