"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { LOCALES } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={cn(
        "flex items-center rounded-full border p-0.5 text-xs font-semibold",
        variant === "dark" ? "border-navy-700 bg-navy-900" : "border-border bg-surface-muted"
      )}
    >
      {LOCALES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          aria-pressed={locale === l.code}
          className={cn(
            "rounded-full px-2.5 py-1.5 transition-colors",
            locale === l.code
              ? variant === "dark"
                ? "bg-gold-500 text-navy-950"
                : "bg-navy-900 text-white"
              : variant === "dark"
                ? "text-cloud-300 hover:text-white"
                : "text-charcoal-500 hover:text-navy-900"
          )}
        >
          {l.native}
        </button>
      ))}
    </div>
  );
}
